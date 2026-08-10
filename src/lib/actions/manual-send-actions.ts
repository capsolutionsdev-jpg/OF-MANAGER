"use server";

import { EmailStatut } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, toBase64 } from "@/lib/email";
import { orgConfigFor } from "@/lib/org-identity";
import { generateToken, appBaseUrl } from "@/lib/token";
import { buildSingleDocPdf } from "@/lib/documents/build-pdf";
import type { ManualEvent } from "@/lib/manual-events";
import {
  emailShell,
  emailParagraph,
  emailButton,
  emailBox,
  emailSignoff,
  esc,
  PRIMARY,
} from "@/lib/email-templates";

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
  body?: string;
  /** Corps HTML habillé (e-mails candidats). Prioritaire sur `body` à l'envoi. */
  html?: string;
  sessionId: string;
  attachments?: { name: string; content: string }[];
}) {
  const res = await sendEmail({
    to: opts.to,
    subject: opts.subject,
    body: opts.body,
    html: opts.html,
    attachments: opts.attachments,
    organismeId: opts.organismeId,
  });
  await prisma.emailLog.create({
    data: {
      organismeId: opts.organismeId,
      destinataire: opts.to,
      sujet: opts.subject,
      corps: opts.html ?? opts.body ?? "",
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

  if (event === "convocation") {
    const dates =
      `📅 <b>Dates</b> : du ${esc(fmt(s.dateDebut))} au ${esc(fmt(s.dateFin))}` +
      (s.horaires ? `<br>🕘 <b>Horaires</b> : ${esc(s.horaires)}` : "") +
      (s.lieu ? `<br>📍 <b>Lieu</b> : ${esc(s.lieu)}` : "");
    const html = emailShell({
      organisme: org.name,
      representant: org.representant,
      body:
        emailParagraph(`Bonjour ${esc(prenom)},`) +
        emailParagraph(`Vous êtes convoqué(e) à la formation <b>« ${esc(f.titre)} »</b>&nbsp;:`) +
        emailBox(dates) +
        emailParagraph(`👉 Merci de vous présenter muni(e) d'une <b>pièce d'identité</b> en cours de validité.`) +
        emailSignoff("Cordialement,", org.representant),
    });
    const sent = await logAndSend({ organismeId, to, subject: `Votre convocation — ${f.titre} 📅`, html, sessionId: s.id });
    await prisma.inscription.update({ where: { id: i.id }, data: { convocationSentAt: new Date() } });
    return sent ? { ok: true } : { ok: false, error: "E-mail non envoyé (config e-mail ?)." };
  }

  if (event === "attestation_entree") {
    const pdf = await buildSingleDocPdf(i.id, "ATTESTATION_ENTREE");
    const html = emailShell({
      organisme: org.name,
      representant: org.representant,
      body:
        emailParagraph(`Bonjour ${esc(prenom)},`) +
        emailParagraph(`Nous confirmons votre <b>entrée en formation « ${esc(f.titre)} »</b> le <b>${esc(fmt(s.dateDebut))}</b>.`) +
        emailBox(`📎 <b>En pièce jointe</b> : votre attestation d'entrée en formation (PDF).`) +
        emailSignoff("Bonne formation,", org.representant),
    });
    const sent = await logAndSend({
      organismeId, to, subject: `✅ Votre attestation d'entrée — ${f.titre}`, html, sessionId: s.id,
      attachments: pdf ? [{ name: "Attestation-entree.pdf", content: toBase64(pdf.data) }] : undefined,
    });
    await prisma.inscription.update({ where: { id: i.id }, data: { attestationEntreeSentAt: new Date() } });
    return sent ? { ok: true } : { ok: false, error: "E-mail non envoyé (config e-mail ?)." };
  }

  if (event === "docs_fin") {
    const pdf = await buildSingleDocPdf(i.id, "ATTESTATION_FIN");
    const docsUrl = i.accessToken ? `${base}/parcours/${i.accessToken}/documents` : "";
    const boxInner =
      `📎 <b>En pièce jointe</b> : votre attestation de fin de formation (PDF).` +
      (i.accessToken
        ? `<br>📂 Vos documents restent disponibles ici&nbsp;: <a href="${esc(docsUrl)}" style="color:${PRIMARY};font-weight:bold">Mes documents</a>`
        : "");
    const html = emailShell({
      organisme: org.name,
      representant: org.representant,
      accent: "green",
      body:
        emailParagraph(`Bonjour ${esc(prenom)},`) +
        emailParagraph(`<b>Félicitations</b> pour avoir suivi la formation <b>« ${esc(f.titre)} »</b>&nbsp;!`) +
        emailBox(boxInner, "green") +
        emailSignoff("Encore bravo,", org.representant),
    });
    const sent = await logAndSend({
      organismeId, to, subject: `🎓 Votre attestation de fin de formation — ${f.titre}`, html, sessionId: s.id,
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
    const html = emailShell({
      organisme: org.name,
      representant: org.representant,
      body:
        emailParagraph(`Bonjour ${esc(prenom)},`) +
        emailParagraph(`Avant de démarrer <b>« ${esc(f.titre)} »</b>, merci de répondre à ce <b>court test de positionnement</b> (5 minutes)&nbsp;:`) +
        emailButton("Faire le test (5 min) →", `${base}/positionnement/${token}`) +
        emailSignoff("Cordialement,", org.representant),
    });
    const sent = await logAndSend({ organismeId, to, subject: `⏱️ 5 minutes pour préparer votre formation — ${f.titre}`, html, sessionId: s.id });
    await prisma.inscription.update({ where: { id: i.id }, data: { positionnementSentAt: new Date() } });
    return sent ? { ok: true } : { ok: false, error: "E-mail non envoyé (config e-mail ?)." };
  }

  // satisfaction
  const token = i.satisfactionToken ?? generateToken();
  if (!i.satisfactionToken) {
    await prisma.inscription.update({ where: { id: i.id }, data: { satisfactionToken: token } });
  }
  const html = emailShell({
    organisme: org.name,
    representant: org.representant,
    body:
      emailParagraph(`Bonjour ${esc(prenom)},`) +
      emailParagraph(`Vous avez suivi <b>« ${esc(f.titre)} »</b>. Votre retour est <b>précieux</b> — merci de compléter ce court questionnaire de satisfaction&nbsp;:`) +
      emailButton("Donner mon avis (2 min) →", `${base}/satisfaction/${token}`) +
      emailSignoff("Merci beaucoup,", org.representant),
  });
  const sent = await logAndSend({ organismeId, to, subject: `💬 Votre avis sur « ${f.titre} » (2 min)`, html, sessionId: s.id });
  await prisma.inscription.update({ where: { id: i.id }, data: { satisfactionSentAt: new Date() } });
  return sent ? { ok: true } : { ok: false, error: "E-mail non envoyé (config e-mail ?)." };
}
