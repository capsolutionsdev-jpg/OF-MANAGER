"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  EmailStatut,
  FinancementType,
  SignatureProvider,
  SignatureStatut,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sendEmail, emailConfigured, toBase64 } from "@/lib/email";
import { orgConfig } from "@/lib/org-config";
import { generateToken, appBaseUrl } from "@/lib/token";
import {
  buildInscriptionPdf,
  buildSingleDocPdf,
  SIGNED_DOC_TYPES,
} from "@/lib/documents/build-pdf";

/**
 * Démarre le parcours candidat : génère un lien unique et envoie l'e-mail
 * invitant le candidat à compléter son dossier puis signer ses documents.
 * Appelée à l'inscription (et ré-appelable manuellement).
 */
export async function startParcours(
  inscriptionId: string,
): Promise<{ ok: boolean; error?: string }> {
  const insc = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    include: { candidat: true, session: { include: { formation: true } } },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };

  const token = insc.accessToken ?? generateToken();
  if (!insc.accessToken) {
    await prisma.inscription.update({
      where: { id: inscriptionId },
      data: { accessToken: token },
    });
  }

  const link = `${appBaseUrl()}/parcours/${token}`;
  const subject = `Votre inscription — ${insc.session.formation.titre}`;
  const body = `Bonjour ${insc.candidat.prenom},

Votre inscription à la formation « ${insc.session.formation.titre} » a bien été enregistrée.

Pour finaliser votre dossier, merci de compléter vos informations et de signer vos documents en cliquant sur le lien sécurisé ci-dessous :

${link}

Ce lien vous est personnel. À l'issue, vous recevrez une copie de vos documents signés.

Cordialement,
${orgConfig.representant} — ${orgConfig.name}`;

  const res = await sendEmail({ to: insc.candidat.email, subject, body });
  await prisma.emailLog.create({
    data: {
      destinataire: insc.candidat.email,
      sujet: subject,
      corps: body,
      statut: res.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
      sentAt: res.sent ? new Date() : null,
      sessionId: insc.sessionId,
    },
  });

  revalidatePath(`/candidats/${insc.candidatId}`);
  revalidatePath(`/sessions/${insc.sessionId}`);
  return { ok: true };
}

/** Bouton serveur : (re)lance le parcours depuis l'interface admin. */
export async function resendParcoursAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const inscriptionId = String(formData.get("inscriptionId"));
  await startParcours(inscriptionId);
}

/** Relance le lien de parcours/signature et renvoie un résultat (pour le toast). */
export async function relanceParcours(
  inscriptionId: string,
): Promise<{ ok: boolean; demo: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, demo: true, error: "Non autorisé." };
  const r = await startParcours(inscriptionId);
  revalidatePath("/signatures");
  return { ok: r.ok, demo: !emailConfigured(), error: r.error };
}

export type ParcoursFormValues = {
  telephone?: string;
  dateNaissance?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  situationPro?: string;
  employeur?: string;
  financementType?: string;
  consent: boolean;
};

/** Soumission publique du formulaire candidat (via le lien tokenisé). */
export async function submitParcoursForm(
  token: string,
  values: ParcoursFormValues,
): Promise<{ ok: boolean; error?: string }> {
  if (!values.consent)
    return { ok: false, error: "Le consentement est requis." };

  const insc = await prisma.inscription.findUnique({
    where: { accessToken: token },
    include: { candidat: true },
  });
  if (!insc) return { ok: false, error: "Lien invalide ou expiré." };

  const clean = (s?: string) => (s && s.trim() !== "" ? s.trim() : null);
  const fin = values.financementType
    ? (values.financementType as FinancementType)
    : null;

  // Mise à jour des coordonnées du candidat
  await prisma.candidat.update({
    where: { id: insc.candidatId },
    data: {
      telephone: clean(values.telephone) ?? insc.candidat.telephone,
      dateNaissance: values.dateNaissance
        ? new Date(values.dateNaissance)
        : insc.candidat.dateNaissance,
      adresse: clean(values.adresse) ?? insc.candidat.adresse,
      codePostal: clean(values.codePostal) ?? insc.candidat.codePostal,
      ville: clean(values.ville) ?? insc.candidat.ville,
      situationPro: clean(values.situationPro) ?? insc.candidat.situationPro,
      employeur: clean(values.employeur) ?? insc.candidat.employeur,
      financementType: fin ?? insc.candidat.financementType,
    },
  });

  await prisma.inscription.update({
    where: { id: insc.id },
    data: {
      formCompletedAt: new Date(),
      financementType: fin ?? insc.financementType,
      consentementRgpd: true,
      consentementDate: new Date(),
    },
  });

  await prisma.consentement.create({
    data: {
      candidatId: insc.candidatId,
      type: "parcours_formulaire",
      accepte: true,
    },
  });

  return { ok: true };
}

/** Soumission publique de l'enquête de satisfaction (via le token dédié). */
export async function submitSatisfaction(
  token: string,
  reponses: {
    notes: Record<string, number>;
    recommander?: number;
    commentaire?: string;
  },
  signatureDataUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/"))
    return { ok: false, error: "Merci de dessiner votre signature." };

  const insc = await prisma.inscription.findUnique({
    where: { satisfactionToken: token },
    select: { id: true, satisfactionCompletedAt: true },
  });
  if (!insc) return { ok: false, error: "Lien invalide ou expiré." };
  if (insc.satisfactionCompletedAt) return { ok: true }; // déjà répondu

  await prisma.inscription.update({
    where: { id: insc.id },
    data: {
      satisfactionJson: { ...reponses, __signature: signatureDataUrl },
      satisfactionCompletedAt: new Date(),
    },
  });
  return { ok: true };
}

/**
 * Signature interne : le candidat signe (clic) ses documents via le lien.
 * Enregistre la trace (horodatage + IP), puis envoie la copie des documents.
 */
export async function signDocuments(
  token: string,
  signataire: string,
  signatureDataUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!signataire || signataire.trim().length < 2)
    return { ok: false, error: "Merci d'inscrire votre nom complet." };
  if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/"))
    return { ok: false, error: "Merci de dessiner votre signature." };

  const insc = await prisma.inscription.findUnique({
    where: { accessToken: token },
    include: { candidat: true, session: { include: { formation: true } } },
  });
  if (!insc) return { ok: false, error: "Lien invalide ou expiré." };
  if (!insc.formCompletedAt)
    return { ok: false, error: "Complétez d'abord vos informations." };
  if (insc.signedAt) return { ok: true }; // déjà signé

  // IP du signataire (traçabilité)
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    null;

  const now = new Date();
  await prisma.inscription.update({
    where: { id: insc.id },
    data: {
      signedAt: now,
      signatureIp: ip,
      signatureDataUrl,
      signatureStatut: SignatureStatut.SIGNEE,
      statut: "VALIDEE",
    },
  });

  await prisma.signatureRequest.create({
    data: {
      provider: SignatureProvider.INTERNE,
      inscriptionId: insc.id,
      statut: SignatureStatut.SIGNEE,
      signataires: [
        { nom: signataire.trim(), email: insc.candidat.email, role: "stagiaire" },
      ],
      signedAt: now,
    },
  });

  // Génère le dossier signé en PDF (joint à l'e-mail) : docs signés + certificat
  const dossier = await buildInscriptionPdf(insc.id, { only: SIGNED_DOC_TYPES });
  const subject = `Vos documents signés — ${insc.session.formation.titre}`;
  const body = `Bonjour ${insc.candidat.prenom},

Nous vous confirmons la signature de vos documents d'inscription le ${now.toLocaleString("fr-FR")}.

Vous trouverez ci-joint, au format PDF, l'ensemble de vos documents signés (fiche d'inscription, contrat, convention, règlement intérieur) ainsi que votre certificat de signature électronique.

Vous recevez par ailleurs votre convocation à la formation.

Cordialement,
${orgConfig.representant} — ${orgConfig.name}`;

  const res = await sendEmail({
    to: insc.candidat.email,
    subject,
    body,
    attachments: dossier
      ? [{ name: dossier.filename, content: toBase64(dossier.data) }]
      : undefined,
  });
  await prisma.emailLog.create({
    data: {
      destinataire: insc.candidat.email,
      sujet: subject,
      corps: body,
      statut: res.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
      sentAt: res.sent ? new Date() : null,
      sessionId: insc.sessionId,
    },
  });

  await prisma.inscription.update({
    where: { id: insc.id },
    data: { docsCopieSentAt: new Date() },
  });

  // Envoi immédiat de la convocation à la formation (une fois les docs signés)
  if (!insc.convocationSentAt) {
    const s = insc.session;
    const f = (d: Date) => d.toLocaleDateString("fr-FR");
    const subjectConv = `Convocation — ${s.formation.titre}`;
    const bodyConv = `Bonjour ${insc.candidat.prenom},

Vos documents étant signés, nous vous confirmons votre convocation à la formation « ${s.formation.titre} », du ${f(s.dateDebut)} au ${f(s.dateFin)}${s.horaires ? ` (${s.horaires})` : ""}${s.lieu ? `, à ${s.lieu}` : ""}.

Merci de vous présenter muni(e) d'une pièce d'identité.

Cordialement,
${orgConfig.representant} — ${orgConfig.name}`;
    const convPdf = await buildSingleDocPdf(insc.id, "CONVOCATION");
    const resConv = await sendEmail({
      to: insc.candidat.email,
      subject: subjectConv,
      body: bodyConv,
      attachments: convPdf
        ? [{ name: "Convocation.pdf", content: toBase64(convPdf.data) }]
        : undefined,
    });
    await prisma.emailLog.create({
      data: {
        destinataire: insc.candidat.email,
        sujet: subjectConv,
        corps: bodyConv,
        statut: resConv.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
        sentAt: resConv.sent ? new Date() : null,
        sessionId: insc.sessionId,
      },
    });
    await prisma.inscription.update({
      where: { id: insc.id },
      data: { convocationSentAt: new Date() },
    });
  }

  revalidatePath(`/candidats/${insc.candidatId}`);
  return { ok: true };
}
