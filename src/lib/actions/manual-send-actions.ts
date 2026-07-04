"use server";

import { EmailStatut } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, toBase64 } from "@/lib/email";
import { orgConfigFor } from "@/lib/org-identity";
import { generateToken, appBaseUrl } from "@/lib/token";
import { buildSingleDocPdf } from "@/lib/documents/build-pdf";
import type { ManualEvent } from "@/lib/manual-events";

const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];
type Result = { ok: true } | { ok: false; error: string };

async function staffOrg(): Promise<string> {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  const organismeId = session?.user?.organismeId;
  if (!session?.user || !role || !STAFF.includes(role) || !organismeId) throw new Error("Non autorisé.");
  return organismeId;
}

const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

async function logAndSend(opts: {
  organismeId: string | null;
  to: string;
  subject: string;
  body: string;
  sessionId: string;
  attachments?: { name: string; content: string }[];
}) {
  const res = await sendEmail({
    to: opts.to,
    subject: opts.subject,
    body: opts.body,
    attachments: opts.attachments,
    organismeId: opts.organismeId,
  });
  await prisma.emailLog.create({
    data: {
      organismeId: opts.organismeId,
      destinataire: opts.to,
      sujet: opts.subject,
      corps: opts.body,
      statut: res.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
      sentAt: res.sent ? new Date() : null,
      sessionId: opts.sessionId,
    },
  });
  return res.sent;
}

/**
 * Déclenche MANUELLEMENT un envoi du parcours pour UNE inscription (indépendamment
 * du calendrier automatique). Utile quand on veut « donner la main » sur un cas
 * précis. Met à jour le jalon daté correspondant.
 */
export async function sendAutomationEventNow(inscriptionId: string, event: ManualEvent): Promise<Result> {
  const organismeId = await staffOrg();
  const i = await prisma.inscription.findFirst({
    where: { id: inscriptionId, organismeId },
    include: { candidat: true, session: { include: { formation: true } } },
  });
  if (!i) return { ok: false, error: "Inscription introuvable." };
  const to = i.candidat.email;
  if (!to || !to.includes("@")) return { ok: false, error: "Le candidat n'a pas d'e-mail valide." };

  const org = await orgConfigFor(i.organismeId);
  const s = i.session;
  const f = s.formation;
  const prenom = i.candidat.prenom;
  const base = appBaseUrl();
  const sign = `\n\nCordialement,\n${org.representant} — ${org.name}`;

  if (event === "convocation") {
    const body = `Bonjour ${prenom},

Vous êtes convoqué(e) à la formation « ${f.titre} », du ${fmt(s.dateDebut)} au ${fmt(s.dateFin)}${s.horaires ? ` (${s.horaires})` : ""}${s.lieu ? `, à ${s.lieu}` : ""}.

Merci de vous présenter muni(e) d'une pièce d'identité.${sign}`;
    const sent = await logAndSend({ organismeId, to, subject: `Convocation — ${f.titre}`, body, sessionId: s.id });
    await prisma.inscription.update({ where: { id: i.id }, data: { convocationSentAt: new Date() } });
    return sent ? { ok: true } : { ok: false, error: "E-mail non envoyé (config e-mail ?)." };
  }

  if (event === "attestation_entree") {
    const pdf = await buildSingleDocPdf(i.id, "ATTESTATION_ENTREE");
    const body = `Bonjour ${prenom},

Nous confirmons votre entrée en formation « ${f.titre} » le ${fmt(s.dateDebut)}. Vous trouverez ci-joint votre attestation d'entrée (PDF).${sign}`;
    const sent = await logAndSend({
      organismeId, to, subject: `Attestation d'entrée — ${f.titre}`, body, sessionId: s.id,
      attachments: pdf ? [{ name: "Attestation-entree.pdf", content: toBase64(pdf.data) }] : undefined,
    });
    await prisma.inscription.update({ where: { id: i.id }, data: { attestationEntreeSentAt: new Date() } });
    return sent ? { ok: true } : { ok: false, error: "E-mail non envoyé (config e-mail ?)." };
  }

  if (event === "docs_fin") {
    const pdf = await buildSingleDocPdf(i.id, "ATTESTATION_FIN");
    const lien = i.accessToken ? `\n\nVos documents restent disponibles ici : ${base}/parcours/${i.accessToken}/documents` : "";
    const body = `Bonjour ${prenom},

Félicitations pour avoir suivi la formation « ${f.titre} ». Vous trouverez ci-joint votre attestation de fin de formation (PDF).${lien}${sign}`;
    const sent = await logAndSend({
      organismeId, to, subject: `Attestation de fin — ${f.titre}`, body, sessionId: s.id,
      attachments: pdf ? [{ name: "Attestation-fin.pdf", content: toBase64(pdf.data) }] : undefined,
    });
    await prisma.inscription.update({ where: { id: i.id }, data: { docsFinSentAt: new Date() } });
    return sent ? { ok: true } : { ok: false, error: "E-mail non envoyé (config e-mail ?)." };
  }

  if (event === "positionnement") {
    const token = i.positionnementToken ?? generateToken();
    if (!i.positionnementToken) {
      await prisma.inscription.update({ where: { id: i.id }, data: { positionnementToken: token } });
    }
    const body = `Bonjour ${prenom},

Avant de commencer la formation « ${f.titre} », merci de répondre à ce court test de positionnement (5 min) :
${base}/positionnement/${token}${sign}`;
    const sent = await logAndSend({ organismeId, to, subject: `Test de positionnement — ${f.titre}`, body, sessionId: s.id });
    await prisma.inscription.update({ where: { id: i.id }, data: { positionnementSentAt: new Date() } });
    return sent ? { ok: true } : { ok: false, error: "E-mail non envoyé (config e-mail ?)." };
  }

  // satisfaction
  const token = i.satisfactionToken ?? generateToken();
  if (!i.satisfactionToken) {
    await prisma.inscription.update({ where: { id: i.id }, data: { satisfactionToken: token } });
  }
  const body = `Bonjour ${prenom},

Vous avez suivi la formation « ${f.titre} ». Votre retour est précieux — merci de compléter ce court questionnaire de satisfaction :
${base}/satisfaction/${token}${sign}`;
  const sent = await logAndSend({ organismeId, to, subject: `Votre avis — ${f.titre}`, body, sessionId: s.id });
  await prisma.inscription.update({ where: { id: i.id }, data: { satisfactionSentAt: new Date() } });
  return sent ? { ok: true } : { ok: false, error: "E-mail non envoyé (config e-mail ?)." };
}
