"use server";

import { revalidatePath } from "next/cache";
import { EmailStatut } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sendEmail, emailConfigured } from "@/lib/email";
import { orgConfigFor } from "@/lib/org-identity";
import { generateToken, appBaseUrl } from "@/lib/token";

const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

/**
 * Envoie au formateur le lien du compte-rendu pédagogique à compléter.
 * Réutilisable (automatisme de fin de session + bouton manuel).
 */
export async function sendCompteRendu(
  sessionId: string,
): Promise<{ ok: boolean; demo: boolean; error?: string }> {
  const s = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { formation: true, formateurs: true },
  });
  if (!s) return { ok: false, demo: true, error: "Session introuvable." };
  const org = await orgConfigFor(s.organismeId);

  const formateur = s.formateurs[0];
  if (!formateur?.email)
    return {
      ok: false,
      demo: true,
      error: "Aucun formateur (avec e-mail) affecté à cette session.",
    };

  const token = s.crFormateurToken ?? generateToken();
  if (!s.crFormateurToken) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { crFormateurToken: token },
    });
  }

  const link = `${appBaseUrl()}/compte-rendu/${token}`;
  const subject = `Compte rendu pédagogique — ${s.formation.titre}`;
  const body = `Bonjour ${formateur.prenom},

La formation « ${s.formation.titre} » (du ${fmt(s.dateDebut)} au ${fmt(s.dateFin)}) est terminée.

Merci de compléter votre compte rendu pédagogique via ce lien :
${link}

Ce document alimente nos indicateurs qualité (Qualiopi).

Cordialement,
${org.representant} — ${org.name}`;

  const res = await sendEmail({ to: formateur.email, subject, body });
  await prisma.emailLog.create({
    data: {
      organismeId: s.organismeId,
      destinataire: formateur.email,
      sujet: subject,
      corps: body,
      statut: res.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
      sentAt: res.sent ? new Date() : null,
      sessionId,
    },
  });

  await prisma.session.update({
    where: { id: sessionId },
    data: { crFormateurSentAt: new Date() },
  });

  revalidatePath(`/sessions/${sessionId}`);
  return { ok: true, demo: !emailConfigured() };
}

/** Bouton client → renvoie le résultat. */
export async function sendCompteRenduAction(
  sessionId: string,
): Promise<{ ok: boolean; demo: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, demo: true, error: "Non autorisé." };
  return sendCompteRendu(sessionId);
}

/** Soumission publique du compte-rendu par le formateur (via token). */
export async function submitCompteRendu(
  token: string,
  reponses: Record<string, string>,
  signatureDataUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/"))
    return { ok: false, error: "Merci de dessiner votre signature." };

  const s = await prisma.session.findUnique({
    where: { crFormateurToken: token },
    select: { id: true, crFormateurCompletedAt: true },
  });
  if (!s) return { ok: false, error: "Lien invalide ou expiré." };

  await prisma.session.update({
    where: { id: s.id },
    data: {
      // La signature est stockée dans le JSON sous une clé dédiée
      crFormateurJson: { ...reponses, __signature: signatureDataUrl },
      crFormateurCompletedAt: new Date(),
    },
  });
  return { ok: true };
}
