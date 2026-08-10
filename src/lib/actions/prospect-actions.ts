"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { FinancementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { sendEmail } from "@/lib/email";
import { orgConfigFor } from "@/lib/org-identity";
import { generateToken, appBaseUrl } from "@/lib/token";
import { logProspectEmail } from "@/lib/actions/crm-actions";
import {
  emailShell,
  emailParagraph,
  emailButton,
  emailBox,
  emailSignoff,
  esc,
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
  const db = await getTenantDb();

  const c = await db.candidat.findUnique({
    where: { id: candidatId },
    select: { id: true, prenom: true, nom: true, email: true, prospectToken: true },
  });
  if (!c) return { ok: false, error: "Prospect introuvable." };
  if (!c.email) return { ok: false, error: "Aucune adresse e-mail pour ce prospect." };

  const token = c.prospectToken ?? generateToken();
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

const clean = (s?: string) => (s && s.trim() !== "" ? s.trim() : null);

/** Soumission publique de la fiche prospect (informations + signature dessinée). */
export async function submitProspectForm(
  token: string,
  v: ProspectFormValues,
  signatureDataUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  const c = await prisma.candidat.findUnique({
    where: { prospectToken: token },
    select: { id: true, organismeId: true, prospectFormCompletedAt: true },
  });
  if (!c) return { ok: false, error: "Lien invalide." };
  if (c.prospectFormCompletedAt) return { ok: true }; // déjà rempli

  if (!v.consent)
    return { ok: false, error: "Merci d'accepter le traitement de vos données (RGPD)." };
  if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/"))
    return { ok: false, error: "Merci de dessiner votre signature." };

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    null;

  const finType =
    v.financementType &&
    (Object.values(FinancementType) as string[]).includes(v.financementType)
      ? (v.financementType as FinancementType)
      : null;

  await prisma.candidat.update({
    where: { id: c.id },
    data: {
      telephone: clean(v.telephone),
      dateNaissance: v.dateNaissance ? new Date(v.dateNaissance) : null,
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
      formationSouhaiteeId: clean(v.formationSouhaiteeId),
      financementType: finType,
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

  revalidatePath("/crm");
  return { ok: true };
}
