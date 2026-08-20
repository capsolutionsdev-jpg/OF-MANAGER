"use server";

import { revalidatePath } from "next/cache";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { CnapsStatut, FinancementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaffTenant } from "@/lib/tenant";
import { auth } from "@/auth";
import { sendEmail } from "@/lib/email";
import { orgConfigFor } from "@/lib/org-identity";
import { sendPushToOrgStaff } from "@/lib/push";
import { generateExpiringToken, expiringTokenExpired, LINK_TTL_DAYS, appBaseUrl } from "@/lib/token";
import { logProspectEmail } from "@/lib/actions/crm-actions";
import {
  emailShell,
  emailParagraph,
  emailButton,
  emailBox,
  emailSignoff,
  esc,
  emailLogoSrc,
} from "@/lib/email-templates";

export type ProspectFormValues = {
  telephone: string;
  dateNaissance: string;
  lieuNaissance: string;
  paysNaissance: string;
  adresse: string;
  codePostal: string;
  ville: string;
  pays: string;
  situationPro: string;
  employeur: string;
  posteOccupe: string;
  dernierDiplome: string;
  sourceConnaissance: string;
  formationSouhaiteeId: string;
  financementType: string;
  // ── Prérequis conditionnels selon la formation (sécurité privée CNAPS / SSIAP) ──
  nationalite?: string;
  departementNaissance?: string;
  cnapsStatut?: string;
  carteProNumero?: string;
  carteProValidite?: string;
  ssiapNiveau?: string;
  ssiapDiplomeNumero?: string;
  ssiapDiplomeDate?: string;
  photoDataUrl?: string; // photo d'identité (data URL JPEG compressée côté client)
  consent: boolean;
};

/**
 * Envoie (ou renvoie) au prospect le lien de son formulaire d'inscription.
 * Le prospect remplit ses informations et signe sa fiche en ligne.
 */
export async function sendProspectIntakeLink(
  candidatId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const { db } = await requireStaffTenant();

  const c = await db.candidat.findUnique({
    where: { id: candidatId },
    select: { id: true, prenom: true, nom: true, email: true, prospectToken: true },
  });
  if (!c) return { ok: false, error: "Prospect introuvable." };
  if (!c.email) return { ok: false, error: "Aucune adresse e-mail pour ce prospect." };

  const token = c.prospectToken ?? generateExpiringToken();
  if (!c.prospectToken) {
    await db.candidat.update({
      where: { id: candidatId },
      data: { prospectToken: token },
    });
  }

  const org = await orgConfigFor(session.user.organismeId);
  const link = `${appBaseUrl()}/prospect/${token}`;
  const subject = `📝 Votre fiche d'inscription — ${org.name}`;
  const html = emailShell({
    organisme: org.name,
    representant: org.representant,
      logoUrl: emailLogoSrc(org.id, org.logoUrl),
    body:
      emailParagraph(`Bonjour ${esc(c.prenom)} ${esc(c.nom)},`) +
      emailParagraph(
        `Suite à votre demande, merci de <b>compléter et signer votre fiche d'inscription</b> en ligne&nbsp;:`,
      ) +
      emailButton("Remplir ma fiche d'inscription →", link) +
      emailBox(
        `Vous renseignez vos informations et la formation souhaitée, puis vous signez directement avec votre <b>doigt</b> (mobile) ou votre <b>souris</b> (ordinateur). 👆`,
      ) +
      emailSignoff("Cordialement,", org.representant),
  });

  const res = await sendEmail({ to: c.email, subject, html });

  await db.candidat.update({
    where: { id: candidatId },
    data: { prospectFormSentAt: new Date() },
  });

  await logProspectEmail(candidatId, "Envoi du lien de la fiche d'inscription");

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "PROSPECT_LINK_SENT",
      entityType: "Candidat",
      entityId: candidatId,
    },
  });

  revalidatePath("/crm");
  revalidatePath(`/candidats/${candidatId}`);
  return {
    ok: true,
    error: res.sent ? undefined : "E-mail non envoyé (mode démo : configurez Brevo).",
  };
}

/**
 * Inscription « à distance » : crée un prospect à partir du strict minimum
 * (nom, prénom, e-mail + formation souhaitée facultative), puis lui envoie le lien
 * de sa fiche d'inscription à compléter + signer en ligne. Le prospect arrive dans
 * le CRM (statut NOUVEAU) ; à la complétion, il passe EN_TRAITEMENT et le staff est
 * notifié — procédure prospect habituelle. Réservé au staff (tenant courant).
 */
export async function creerProspectEtInviter(input: {
  nom: string;
  prenom: string;
  email: string;
  formationSouhaiteeId?: string;
}): Promise<{ ok: boolean; candidatId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const { db } = await requireStaffTenant();

  const nom = input.nom?.trim();
  const prenom = input.prenom?.trim();
  const email = input.email?.trim().toLowerCase();
  if (!nom || !prenom) return { ok: false, error: "Nom et prénom sont requis." };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "Adresse e-mail invalide." };

  // Formation souhaitée : conservée seulement si elle appartient à l'organisme
  // (db est déjà scopé au tenant courant).
  const fid = input.formationSouhaiteeId?.trim();
  const formationSouhaiteeId = fid
    ? ((await db.formation.findFirst({ where: { id: fid }, select: { id: true } }))?.id ?? null)
    : null;

  const candidat = await db.candidat.create({
    data: {
      nom,
      prenom,
      email,
      formationSouhaiteeId,
      statut: "NOUVEAU",
      createdById: session.user.id,
    },
    select: { id: true },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE",
      entityType: "Candidat",
      entityId: candidat.id,
    },
  });

  // Envoi immédiat du lien de la fiche d'inscription.
  const sent = await sendProspectIntakeLink(candidat.id);
  revalidatePath("/candidats");
  return { ok: true, candidatId: candidat.id, error: sent.error };
}

const clean = (s?: string) => (s && s.trim() !== "" ? s.trim() : null);
// Parse sûr d'une date issue d'une entrée PUBLIQUE non fiable : renvoie null si
// vide OU invalide (un « Invalid Date » ferait planter la requête Prisma / un POST forgé).
const toDate = (s?: string) => {
  if (!s || !s.trim()) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Soumission publique de la fiche prospect (informations + signature dessinée). */
export async function submitProspectForm(
  token: string,
  v: ProspectFormValues,
  signatureDataUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  const c = await prisma.candidat.findUnique({
    where: { prospectToken: token },
    select: { id: true, organismeId: true, prospectFormCompletedAt: true, prenom: true, nom: true },
  });
  if (!c) return { ok: false, error: "Lien invalide." };
  if (c.prospectFormCompletedAt) return { ok: true }; // déjà rempli
  // Lien prospect expiré (60 j après émission — horodatage embarqué dans le token). §magic-links
  if (expiringTokenExpired(token, LINK_TTL_DAYS.SIGNATURE))
    return { ok: false, error: "Ce lien a expiré. Contactez l'organisme pour en recevoir un nouveau." };

  if (!v.consent)
    return { ok: false, error: "Merci d'accepter le traitement de vos données (RGPD)." };
  if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/"))
    return { ok: false, error: "Merci de dessiner votre signature." };

  const hdrs = await headers();
  const ip = clientIpFromHeaders(hdrs);

  const finType =
    v.financementType &&
    (Object.values(FinancementType) as string[]).includes(v.financementType)
      ? (v.financementType as FinancementType)
      : null;

  // Formulaire PUBLIC (token) → on ne fait pas confiance à l'id soumis : on ne
  // conserve la formation souhaitée que si elle appartient bien à l'organisme du
  // prospect (sinon référence croisée vers un autre organisme). §21.
  const fidRaw = clean(v.formationSouhaiteeId);
  const formationSouhaiteeId = fidRaw
    ? (await prisma.formation.findFirst({
        where: { id: fidRaw, organismeId: c.organismeId },
        select: { id: true },
      }))?.id ?? null
    : null;

  await prisma.candidat.update({
    where: { id: c.id },
    data: {
      telephone: clean(v.telephone),
      dateNaissance: toDate(v.dateNaissance),
      lieuNaissance: clean(v.lieuNaissance),
      paysNaissance: clean(v.paysNaissance),
      adresse: clean(v.adresse),
      codePostal: clean(v.codePostal),
      ville: clean(v.ville),
      pays: clean(v.pays) ?? "France",
      situationPro: clean(v.situationPro),
      employeur: clean(v.employeur),
      posteOccupe: clean(v.posteOccupe),
      dernierDiplome: clean(v.dernierDiplome),
      sourceConnaissance: clean(v.sourceConnaissance),
      nationalite: clean(v.nationalite),
      departementNaissance: clean(v.departementNaissance),
      formationSouhaiteeId,
      financementType: finType,
      // Sécurité privée (CNAPS) — n° stocké dans carteProNumero (autorisation OU carte
      // pro, comme le formulaire interne). Statut validé contre l'enum (entrée publique).
      cnapsStatut:
        v.cnapsStatut && (Object.values(CnapsStatut) as string[]).includes(v.cnapsStatut)
          ? (v.cnapsStatut as CnapsStatut)
          : null,
      carteProNumero: clean(v.carteProNumero),
      carteProValidite: toDate(v.carteProValidite),
      // Diplôme SSIAP détenu (recyclage / remise à niveau)
      ssiapNiveau:
        v.ssiapNiveau && /^[123]$/.test(v.ssiapNiveau.trim())
          ? Number(v.ssiapNiveau.trim())
          : null,
      ssiapDiplomeNumero: clean(v.ssiapDiplomeNumero),
      ssiapDiplomeDate: toDate(v.ssiapDiplomeDate),
      // Photo d'identité : uniquement si fournie et bien une image encodée
      ...(v.photoDataUrl?.startsWith("data:image/")
        ? { photoUrl: v.photoDataUrl }
        : {}),
      prospectFormCompletedAt: new Date(),
      prospectSignatureUrl: signatureDataUrl,
      prospectSignatureIp: ip,
      // Le prospect a renseigné sa fiche → prêt à être inscrit à une session
      statut: "EN_TRAITEMENT",
    },
  });

  // Consentement RGPD horodaté
  await prisma.consentement.create({
    data: {
      organismeId: c.organismeId,
      candidatId: c.id,
      type: "fiche_prospect",
      accepte: true,
      ip: ip ?? undefined,
    },
  });

  // Notification staff : un prospect a complété + signé sa fiche (procédure habituelle,
  // app mobile). Non bloquant, no-op sans FCM configuré.
  await sendPushToOrgStaff(c.organismeId, {
    title: "🆕 Fiche prospect complétée",
    body: `${c.prenom} ${c.nom} a rempli et signé sa fiche d'inscription.`,
    data: { type: "prospect", candidatId: c.id },
  }).catch(() => {});

  revalidatePath("/crm");
  return { ok: true };
}
