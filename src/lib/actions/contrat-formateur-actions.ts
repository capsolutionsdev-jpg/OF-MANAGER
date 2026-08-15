"use server";

import { revalidatePath } from "next/cache";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { EmailStatut } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sendEmail, emailConfigured, toBase64 } from "@/lib/email";
import { orgConfigFor } from "@/lib/org-identity";
import { generateToken, appBaseUrl } from "@/lib/token";
import { buildContratFormateurPdf } from "@/lib/documents/build-pdf";

const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

/** Envoie le contrat de sous-traitance au formateur pour signature. */
export async function sendContratFormateur(
  sessionId: string,
): Promise<{ ok: boolean; demo: boolean; error?: string }> {
  // Cette fonction est un point d'entrée server action (exportée) : elle doit se
  // garder elle-même (auth + cloisonnement tenant), sans dépendre du wrapper.
  const session = await auth();
  if (!session?.user) return { ok: false, demo: true, error: "Non autorisé." };
  const s = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { formation: true, formateurs: true },
  });
  if (!s) return { ok: false, demo: true, error: "Session introuvable." };
  if (session.user.role !== "SUPERADMIN" && s.organismeId !== session.user.organismeId)
    return { ok: false, demo: true, error: "Accès refusé (autre organisme)." };
  const f = s.formateurs[0];
  // Formateur interne (salarié) → pas de contrat de sous-traitance (#15).
  if (f?.typeContrat === "INTERNE")
    return {
      ok: false,
      demo: true,
      error: "Formateur interne (salarié de l'école) — aucun contrat de sous-traitance à envoyer.",
    };
  if (!f?.email)
    return {
      ok: false,
      demo: true,
      error: "Aucun formateur (avec e-mail) affecté à cette session.",
    };
  if (s.tarifFormateurJour == null && f.tarifJournalier == null)
    return {
      ok: false,
      demo: true,
      error:
        "Renseignez d'abord le tarif journalier (sur la session ou le formateur).",
    };
  const org = await orgConfigFor(s.organismeId);

  const token = s.contratFormateurToken ?? generateToken();
  if (!s.contratFormateurToken) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { contratFormateurToken: token },
    });
  }

  const link = `${appBaseUrl()}/contrat-formateur/${token}`;
  const subject = `Contrat de sous-traitance — ${s.formation.titre}`;
  const body = `Bonjour ${f.prenom},

Veuillez trouver ci-joint votre contrat de sous-traitance pour la formation « ${s.formation.titre} » (du ${fmt(s.dateDebut)} au ${fmt(s.dateFin)}).

Merci de le relire et de le signer en ligne via ce lien sécurisé :
${link}

Cordialement,
${org.representant} — ${org.name}`;

  const pdf = await buildContratFormateurPdf(sessionId);
  const res = await sendEmail({
    to: f.email,
    subject,
    body,
    attachments: pdf
      ? [{ name: "Contrat-formateur.pdf", content: toBase64(pdf.data) }]
      : undefined,
  });
  await prisma.emailLog.create({
    data: {
      organismeId: s.organismeId,
      destinataire: f.email,
      sujet: subject,
      corps: body,
      statut: res.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
      sentAt: res.sent ? new Date() : null,
      sessionId,
    },
  });

  await prisma.session.update({
    where: { id: sessionId },
    data: { contratFormateurSentAt: new Date() },
  });

  revalidatePath(`/sessions/${sessionId}`);
  return { ok: true, demo: !emailConfigured() };
}

/** Bouton client : renvoie le résultat. */
export async function sendContratFormateurAction(
  sessionId: string,
): Promise<{ ok: boolean; demo: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, demo: true, error: "Non autorisé." };
  return sendContratFormateur(sessionId);
}

/** Signature publique du contrat par le formateur (dessin). */
export async function signContratFormateur(
  token: string,
  signatureDataUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/"))
    return { ok: false, error: "Merci de dessiner votre signature." };

  const s = await prisma.session.findUnique({
    where: { contratFormateurToken: token },
    select: { id: true, organismeId: true, contratFormateurSignedAt: true },
  });
  if (!s) return { ok: false, error: "Lien invalide ou expiré." };
  if (s.contratFormateurSignedAt) return { ok: true };
  const org = await orgConfigFor(s.organismeId);

  const hdrs = await headers();
  const ip = clientIpFromHeaders(hdrs);

  await prisma.session.update({
    where: { id: s.id },
    data: {
      contratFormateurSignedAt: new Date(),
      contratFormateurSignatureUrl: signatureDataUrl,
    },
  });

  // Notif interne (journal) — l'organisme retrouve le contrat signé dans la session
  await prisma.emailLog.create({
    data: {
      organismeId: s.organismeId,
      destinataire: org.email,
      sujet: `Contrat formateur signé`,
      corps: `Le contrat de sous-traitance a été signé (IP ${ip ?? "—"}).`,
      statut: EmailStatut.ENVOYE,
      sentAt: new Date(),
      sessionId: s.id,
    },
  });

  revalidatePath(`/sessions/${s.id}`);
  return { ok: true };
}