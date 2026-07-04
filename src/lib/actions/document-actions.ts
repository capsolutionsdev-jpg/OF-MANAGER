"use server";

import { revalidatePath } from "next/cache";
import { EmailStatut } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, toBase64 } from "@/lib/email";
import { buildSingleDocPdf } from "@/lib/documents/build-pdf";
import { DOCUMENTS } from "@/lib/documents/templates";
import { orgConfigFor } from "@/lib/org-identity";

const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];
type Result = { ok: true } | { ok: false; error: string };

async function staffOrg(): Promise<string> {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  const organismeId = session?.user?.organismeId;
  if (!session?.user || !role || !STAFF.includes(role) || !organismeId) throw new Error("Non autorisé.");
  return organismeId;
}

/**
 * Envoie manuellement un document (au choix) au candidat, par e-mail, en pièce
 * jointe PDF. Réutilise la génération de document existante (buildSingleDocPdf).
 */
export async function sendDocumentToCandidate(
  inscriptionId: string,
  type: string,
  messagePerso?: string,
): Promise<Result> {
  const organismeId = await staffOrg();
  const doc = DOCUMENTS[type];
  if (!doc) return { ok: false, error: "Type de document inconnu." };

  const insc = await prisma.inscription.findFirst({
    where: { id: inscriptionId, organismeId },
    select: {
      id: true,
      organismeId: true,
      sessionId: true,
      candidat: { select: { email: true, prenom: true, nom: true } },
      session: { select: { formation: { select: { titre: true } } } },
    },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };
  if (!insc.candidat.email || !insc.candidat.email.includes("@")) {
    return { ok: false, error: "Le candidat n'a pas d'adresse e-mail valide." };
  }

  const pdf = await buildSingleDocPdf(inscriptionId, type);
  if (!pdf) return { ok: false, error: "Impossible de générer ce document." };

  const org = await orgConfigFor(insc.organismeId);
  const titre = insc.session.formation.titre;
  const subject = `${doc.label} — ${titre}`;
  const body =
    `Bonjour ${insc.candidat.prenom},\n\n` +
    `Vous trouverez ci-joint le document suivant : ${doc.label}.` +
    (messagePerso && messagePerso.trim() ? `\n\n${messagePerso.trim()}` : "") +
    `\n\nCordialement,\n${org.representant} — ${org.name}`;

  const res = await sendEmail({
    to: insc.candidat.email,
    subject,
    body,
    attachments: [{ name: pdf.filename || `${type}.pdf`, content: toBase64(pdf.data) }],
    organismeId,
  });

  await prisma.emailLog.create({
    data: {
      organismeId,
      destinataire: insc.candidat.email,
      sujet: subject,
      corps: body,
      statut: res.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
      sentAt: res.sent ? new Date() : null,
      sessionId: insc.sessionId,
    },
  });

  revalidatePath(`/sessions/${insc.sessionId}`);
  if (!res.sent) return { ok: false, error: "L'e-mail n'a pas pu être envoyé (vérifiez la configuration e-mail)." };
  return { ok: true };
}

/**
 * Envoie PLUSIEURS documents (sélection) au candidat, en un seul e-mail avec
 * autant de pièces jointes PDF. Chaque document est généré via buildSingleDocPdf.
 */
export async function sendDocumentsToCandidate(
  inscriptionId: string,
  types: string[],
  messagePerso?: string,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const organismeId = await staffOrg();
  const chosen = (types ?? []).filter((t) => DOCUMENTS[t]);
  if (chosen.length === 0) return { ok: false, error: "Sélectionnez au moins un document." };

  const insc = await prisma.inscription.findFirst({
    where: { id: inscriptionId, organismeId },
    select: {
      id: true,
      organismeId: true,
      sessionId: true,
      candidat: { select: { email: true, prenom: true } },
      session: { select: { formation: { select: { titre: true } } } },
    },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };
  if (!insc.candidat.email || !insc.candidat.email.includes("@")) {
    return { ok: false, error: "Le candidat n'a pas d'adresse e-mail valide." };
  }

  const attachments: { name: string; content: string }[] = [];
  const labels: string[] = [];
  for (const type of chosen) {
    const pdf = await buildSingleDocPdf(inscriptionId, type);
    if (pdf) {
      attachments.push({ name: pdf.filename || `${type}.pdf`, content: toBase64(pdf.data) });
      labels.push(DOCUMENTS[type].label);
    }
  }
  if (attachments.length === 0) return { ok: false, error: "Aucun document n'a pu être généré." };

  const org = await orgConfigFor(insc.organismeId);
  const titre = insc.session.formation.titre;
  const subject =
    attachments.length === 1 ? `${labels[0]} — ${titre}` : `Vos documents — ${titre}`;
  const liste = labels.map((l) => `• ${l}`).join("\n");
  const body =
    `Bonjour ${insc.candidat.prenom},\n\n` +
    `Vous trouverez ci-joint ${attachments.length > 1 ? "les documents suivants" : "le document suivant"} :\n${liste}` +
    (messagePerso && messagePerso.trim() ? `\n\n${messagePerso.trim()}` : "") +
    `\n\nCordialement,\n${org.representant} — ${org.name}`;

  const res = await sendEmail({ to: insc.candidat.email, subject, body, attachments, organismeId });
  await prisma.emailLog.create({
    data: {
      organismeId,
      destinataire: insc.candidat.email,
      sujet: subject,
      corps: body,
      statut: res.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
      sentAt: res.sent ? new Date() : null,
      sessionId: insc.sessionId,
    },
  });
  revalidatePath(`/sessions/${insc.sessionId}`);
  if (!res.sent) return { ok: false, error: "L'e-mail n'a pas pu être envoyé (vérifiez la configuration e-mail)." };
  return { ok: true, count: attachments.length };
}

/**
 * Marque manuellement le parcours de signature d'une inscription comme
 * « signé sur place » (documents signés physiquement au centre) — action
 * « signé sur place » (documents signés physiquement au centre) — action
 * manuelle équivalente à la signature électronique.
 */
export async function markInscriptionSignedOnSite(inscriptionId: string): Promise<Result> {
  const organismeId = await staffOrg();
  const insc = await prisma.inscription.findFirst({
    where: { id: inscriptionId, organismeId },
    select: { id: true, formCompletedAt: true },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };
  await prisma.inscription.update({
    where: { id: inscriptionId },
    data: {
      signedAt: new Date(),
      formCompletedAt: insc.formCompletedAt ?? new Date(),
    },
  });
  revalidatePath("/signatures");
  return { ok: true };
}
