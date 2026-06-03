import { EmailStatut, DemiJournee } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail, toBase64, type EmailAttachment } from "@/lib/email";
import { orgConfig } from "@/lib/org-config";
import { generateToken, appBaseUrl } from "@/lib/token";
import { getAutomationSettings } from "@/lib/automation-settings";
import { buildSingleDocPdf } from "@/lib/documents/build-pdf";

const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

type Counts = {
  convocations: number;
  attestationsEntree: number;
  satisfactions: number;
  docsFin: number;
  compteRendus: number;
  emargements: number;
};

async function logAndSend(opts: {
  to: string;
  subject: string;
  body: string;
  sessionId: string;
  attachments?: EmailAttachment[];
}) {
  const res = await sendEmail({
    to: opts.to,
    subject: opts.subject,
    body: opts.body,
    attachments: opts.attachments,
  });
  await prisma.emailLog.create({
    data: {
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
 * Exécute tous les automatismes du parcours (idempotent grâce aux jalons
 * datés sur l'inscription). Appelé par le cron quotidien ou manuellement.
 */
export async function runAutomations(): Promise<Counts> {
  const now = new Date();
  const base = appBaseUrl();
  const counts: Counts = {
    convocations: 0,
    attestationsEntree: 0,
    satisfactions: 0,
    docsFin: 0,
    compteRendus: 0,
    emargements: 0,
  };

  const settings = await getAutomationSettings();

  const inscriptions = await prisma.inscription.findMany({
    where: { statut: { not: "ANNULEE" } },
    include: { candidat: true, session: { include: { formation: true } } },
  });

  const jMoinsLimite = new Date(
    now.getTime() + settings.convocationJMoins * 24 * 60 * 60 * 1000,
  );

  for (const i of inscriptions) {
    const s = i.session;
    const f = s.formation;
    const to = i.candidat.email;
    const prenom = i.candidat.prenom;

    // ── 1) CONVOCATION (signé, J-7, pas déjà envoyée, session à venir) ──
    if (
      settings.convocationActive &&
      i.signedAt &&
      !i.convocationSentAt &&
      s.dateDebut >= now &&
      s.dateDebut <= jMoinsLimite
    ) {
      const subject = `Convocation — ${f.titre}`;
      const body = `Bonjour ${prenom},

Vous êtes convoqué(e) à la formation « ${f.titre} », du ${fmt(s.dateDebut)} au ${fmt(s.dateFin)}${s.horaires ? ` (${s.horaires})` : ""}${s.lieu ? `, à ${s.lieu}` : ""}.

Merci de vous présenter muni(e) d'une pièce d'identité.

Cordialement,
${orgConfig.representant} — ${orgConfig.name}`;
      await logAndSend({ to, subject, body, sessionId: s.id });
      await prisma.inscription.update({
        where: { id: i.id },
        data: { convocationSentAt: new Date() },
      });
      counts.convocations++;
    }

    // ── 2) ATTESTATION D'ENTRÉE (J1 atteint, signé, pas déjà envoyée) ──
    if (
      settings.attestationEntreeActive &&
      i.signedAt &&
      !i.attestationEntreeSentAt &&
      s.dateDebut <= now &&
      i.accessToken
    ) {
      const subject = `Attestation d'entrée en formation — ${f.titre}`;
      const body = `Bonjour ${prenom},

Nous confirmons votre entrée en formation « ${f.titre} » le ${fmt(s.dateDebut)}.

Vous trouverez ci-joint votre attestation d'entrée signée, au format PDF.

Bonne formation,
${orgConfig.representant} — ${orgConfig.name}`;
      const attPdf = await buildSingleDocPdf(i.id, "ATTESTATION_ENTREE");
      await logAndSend({
        to,
        subject,
        body,
        sessionId: s.id,
        attachments: attPdf
          ? [{ name: "Attestation-entree.pdf", content: toBase64(attPdf.data) }]
          : undefined,
      });
      await prisma.inscription.update({
        where: { id: i.id },
        data: { attestationEntreeSentAt: new Date() },
      });
      counts.attestationsEntree++;
    }

    // ── 3) ENQUÊTE DE SATISFACTION (formation terminée, pas déjà envoyée) ──
    if (settings.satisfactionActive && !i.satisfactionSentAt && s.dateFin < now) {
      const satToken = i.satisfactionToken ?? generateToken();
      if (!i.satisfactionToken) {
        await prisma.inscription.update({
          where: { id: i.id },
          data: { satisfactionToken: satToken },
        });
      }
      const subject = `Votre avis sur la formation — ${f.titre}`;
      const body = `Bonjour ${prenom},

Vous venez de terminer la formation « ${f.titre} ». Votre retour est précieux !

Merci de compléter ce court questionnaire de satisfaction :
${base}/satisfaction/${satToken}

Cordialement,
${orgConfig.representant} — ${orgConfig.name}`;
      await logAndSend({ to, subject, body, sessionId: s.id });
      await prisma.inscription.update({
        where: { id: i.id },
        data: { satisfactionSentAt: new Date() },
      });
      counts.satisfactions++;
    }

    // ── 4) DOCUMENTS DE FIN DE FORMATION (terminée, pas déjà envoyés) ──
    if (settings.docsFinActive && !i.docsFinSentAt && s.dateFin < now && i.accessToken) {
      const subject = `Documents de fin de formation — ${f.titre}`;
      const body = `Bonjour ${prenom},

Félicitations pour avoir suivi la formation « ${f.titre} » (du ${fmt(s.dateDebut)} au ${fmt(s.dateFin)}).

Vos documents de fin de formation (attestation de fin, certificat de réalisation…) sont disponibles ici :
${base}/parcours/${i.accessToken}/documents

Cordialement,
${orgConfig.representant} — ${orgConfig.name}`;
      await logAndSend({ to, subject, body, sessionId: s.id });
      await prisma.inscription.update({
        where: { id: i.id },
        data: { docsFinSentAt: new Date() },
      });
      counts.docsFin++;
    }
  }

  // ── 5) COMPTE-RENDU FORMATEUR (session terminée, formateur avec e-mail, non envoyé) ──
  const sessionsTerminees = settings.compteRenduActive
    ? await prisma.session.findMany({
        where: {
          statut: { not: "ANNULEE" },
          dateFin: { lt: now },
          crFormateurSentAt: null,
        },
        include: { formation: true, formateurs: true },
      })
    : [];

  for (const s of sessionsTerminees) {
    const f = s.formateurs[0];
    if (!f?.email) continue;
    const token = s.crFormateurToken ?? generateToken();
    if (!s.crFormateurToken) {
      await prisma.session.update({
        where: { id: s.id },
        data: { crFormateurToken: token },
      });
    }
    const subject = `Compte rendu pédagogique — ${s.formation.titre}`;
    const body = `Bonjour ${f.prenom},

La formation « ${s.formation.titre} » (du ${fmt(s.dateDebut)} au ${fmt(s.dateFin)}) est terminée.

Merci de compléter votre compte rendu pédagogique via ce lien :
${base}/compte-rendu/${token}

Ce document alimente nos indicateurs qualité (Qualiopi).

Cordialement,
${orgConfig.representant} — ${orgConfig.name}`;
    await logAndSend({ to: f.email, subject, body, sessionId: s.id });
    await prisma.session.update({
      where: { id: s.id },
      data: { crFormateurSentAt: new Date() },
    });
    counts.compteRendus++;
  }

  // ── 6) ÉMARGEMENT DU JOUR (matin avant 13h, après-midi ensuite) ──
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);
  const demiNow = now.getHours() < 13 ? DemiJournee.MATIN : DemiJournee.APRES_MIDI;
  const demiLabel = demiNow === DemiJournee.MATIN ? "matin" : "après-midi";

  const emargs = settings.emargementActive
    ? await prisma.emargementSignature.findMany({
        where: { date: { gte: startToday, lt: endToday }, demi: demiNow, sentAt: null },
        include: { session: { include: { formation: true } } },
      })
    : [];

  for (const e of emargs) {
    const link = `${base}/emarger/${e.token}`;
    const subject = `Émargement ${demiLabel} — ${e.session.formation.titre}`;
    const body = `Bonjour ${e.nom},

Merci de signer votre présence (${demiLabel}) à la formation « ${e.session.formation.titre} » en cliquant sur ce lien :
${link}

Cordialement,
${orgConfig.representant} — ${orgConfig.name}`;
    await logAndSend({ to: e.email, subject, body, sessionId: e.sessionId });
    await prisma.emargementSignature.update({
      where: { id: e.id },
      data: { sentAt: new Date() },
    });
    counts.emargements++;
  }

  return counts;
}
