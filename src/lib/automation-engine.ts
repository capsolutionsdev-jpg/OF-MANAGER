import { EmailStatut } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { orgConfig } from "@/lib/org-config";
import { generateToken, appBaseUrl } from "@/lib/token";

const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

// Nombre de jours avant le début pour envoyer la convocation
const CONVOCATION_J_MOINS = 7;

type Counts = {
  convocations: number;
  attestationsEntree: number;
  satisfactions: number;
  docsFin: number;
};

async function logAndSend(opts: {
  to: string;
  subject: string;
  body: string;
  sessionId: string;
}) {
  const res = await sendEmail({
    to: opts.to,
    subject: opts.subject,
    body: opts.body,
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
  };

  const inscriptions = await prisma.inscription.findMany({
    where: { statut: { not: "ANNULEE" } },
    include: { candidat: true, session: { include: { formation: true } } },
  });

  const jMoinsLimite = new Date(
    now.getTime() + CONVOCATION_J_MOINS * 24 * 60 * 60 * 1000,
  );

  for (const i of inscriptions) {
    const s = i.session;
    const f = s.formation;
    const to = i.candidat.email;
    const prenom = i.candidat.prenom;

    // ── 1) CONVOCATION (signé, J-7, pas déjà envoyée, session à venir) ──
    if (
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
      i.signedAt &&
      !i.attestationEntreeSentAt &&
      s.dateDebut <= now &&
      i.accessToken
    ) {
      const subject = `Attestation d'entrée en formation — ${f.titre}`;
      const body = `Bonjour ${prenom},

Nous confirmons votre entrée en formation « ${f.titre} » le ${fmt(s.dateDebut)}.

Votre attestation d'entrée est disponible avec vos documents :
${base}/parcours/${i.accessToken}/documents

Bonne formation,
${orgConfig.representant} — ${orgConfig.name}`;
      await logAndSend({ to, subject, body, sessionId: s.id });
      await prisma.inscription.update({
        where: { id: i.id },
        data: { attestationEntreeSentAt: new Date() },
      });
      counts.attestationsEntree++;
    }

    // ── 3) ENQUÊTE DE SATISFACTION (formation terminée, pas déjà envoyée) ──
    if (!i.satisfactionSentAt && s.dateFin < now) {
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
    if (!i.docsFinSentAt && s.dateFin < now && i.accessToken) {
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

  return counts;
}
