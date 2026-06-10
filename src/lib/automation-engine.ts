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
  convocationsExamen: number;
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
    convocationsExamen: 0,
    attestationsEntree: 0,
    satisfactions: 0,
    docsFin: 0,
    compteRendus: 0,
    emargements: 0,
  };

  const settings = await getAutomationSettings();

  const inscriptions = await prisma.inscription.findMany({
    where: { statut: { not: "ANNULEE" } },
    include: { candidat: { include: { entreprise: true } }, session: { include: { formation: true } } },
  });

  const jMoinsLimite = new Date(
    now.getTime() + settings.convocationJMoins * 24 * 60 * 60 * 1000,
  );

  for (const i of inscriptions) {
    const s = i.session;
    const f = s.formation;
    const to = i.candidat.email;
    const prenom = i.candidat.prenom;
    // Client professionnel : copies des documents à l'entreprise (B2B)
    const entEmail = i.candidat.entreprise?.contactEmail ?? null;
    const entNom = i.candidat.entreprise?.raisonSociale ?? "";
    const stagiaire = `${i.candidat.prenom} ${i.candidat.nom}`;

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
      if (entEmail) {
        await logAndSend({
          to: entEmail,
          subject: `Convocation de votre salarié — ${f.titre}`,
          body: `Bonjour,

Votre salarié(e) ${stagiaire} est convoqué(e) à la formation « ${f.titre} », du ${fmt(s.dateDebut)} au ${fmt(s.dateFin)}${s.horaires ? ` (${s.horaires})` : ""}${s.lieu ? `, à ${s.lieu}` : ""}.

Cordialement,
${orgConfig.representant} — ${orgConfig.name}`,
          sessionId: s.id,
        });
      }
      await prisma.inscription.update({
        where: { id: i.id },
        data: { convocationSentAt: new Date() },
      });
      counts.convocations++;
    }

    // ── 1bis) CONVOCATION À L'EXAMEN (signé, J-7 avant la fin, mail séparé + PDF) ──
    if (
      settings.convocationActive &&
      i.signedAt &&
      !i.convocationExamenSentAt &&
      s.dateFin >= now &&
      s.dateFin <= jMoinsLimite
    ) {
      const subject = `Convocation à l'examen — ${f.titre}`;
      const body = `Bonjour ${prenom},

Vous êtes convoqué(e) à l'épreuve de certification de la formation « ${f.titre} », prévue le ${fmt(s.dateFin)}${s.horaires ? ` (${s.horaires})` : ""}${s.lieu ? `, à ${s.lieu}` : ""}.

Vous trouverez votre convocation à l'examen en pièce jointe (PDF). Merci de vous présenter muni(e) d'une pièce d'identité en cours de validité.

Cordialement,
${orgConfig.representant} — ${orgConfig.name}`;
      const cvxPdf = await buildSingleDocPdf(i.id, "CONVOCATION_EXAMEN");
      await logAndSend({
        to,
        subject,
        body,
        sessionId: s.id,
        attachments: cvxPdf
          ? [{ name: "Convocation-examen.pdf", content: toBase64(cvxPdf.data) }]
          : undefined,
      });
      await prisma.inscription.update({
        where: { id: i.id },
        data: { convocationExamenSentAt: new Date() },
      });
      counts.convocationsExamen++;
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
      const attPj = attPdf
        ? [{ name: "Attestation-entree.pdf", content: toBase64(attPdf.data) }]
        : undefined;
      await logAndSend({ to, subject, body, sessionId: s.id, attachments: attPj });
      if (entEmail) {
        await logAndSend({
          to: entEmail,
          subject: `Attestation d'entrée en formation de votre salarié — ${f.titre}`,
          body: `Bonjour,

Nous confirmons l'entrée en formation de votre salarié(e) ${stagiaire} — « ${f.titre} », le ${fmt(s.dateDebut)}.

Vous trouverez l'attestation d'entrée en pièce jointe (PDF).

Cordialement,
${orgConfig.representant} — ${orgConfig.name}`,
          sessionId: s.id,
          attachments: attPj,
        });
      }
      await prisma.inscription.update({
        where: { id: i.id },
        data: { attestationEntreeSentAt: new Date() },
      });
      counts.attestationsEntree++;
    }

    // ── 2ter) TEST DE POSITIONNEMENT (1er jour de formation, lien en ligne) ──
    // Envoyé au passage du cron du matin (~9h) le jour du démarrage de la session.
    if (!i.positionnementSentAt && s.dateDebut <= now && s.dateFin >= now) {
      const posToken = i.positionnementToken ?? generateToken();
      if (!i.positionnementToken) {
        await prisma.inscription.update({
          where: { id: i.id },
          data: { positionnementToken: posToken },
        });
      }
      const posSubject = `Test de positionnement — ${f.titre}`;
      const posBody = `Bonjour ${prenom},

Bienvenue dans votre formation « ${f.titre} » !

Avant de commencer, merci de répondre à ce court test de positionnement
(une dizaine de questions, 5 minutes). Il nous permet d'adapter le contenu
et le rythme à votre profil :

${base}/positionnement/${posToken}

Vos réponses, signées, seront conservées dans votre dossier de formation.

Bonne formation,
${orgConfig.representant} — ${orgConfig.name}`;
      await logAndSend({ to, subject: posSubject, body: posBody, sessionId: s.id });
      await prisma.inscription.update({
        where: { id: i.id },
        data: { positionnementSentAt: new Date() },
      });
    }

    // ── 3) ENQUÊTE DE SATISFACTION (formation terminée, pas déjà envoyée) ──
    if (settings.satisfactionActive && !i.satisfactionSentAt && s.dateFin < now) {
      const satToken = i.satisfactionToken ?? generateToken();
      if (!i.satisfactionToken) {
        await prisma.inscription.update({
          where: { id: i.id },
          data: { satisfactionToken: satToken },
        });
        i.satisfactionToken = satToken; // garde l'objet local cohérent (réutilisé en 3bis)
      }
      const subject = `Votre avis sur la formation — ${f.titre}`;
      const body = `Bonjour ${prenom},

Vous venez de terminer la formation « ${f.titre} ». Votre retour est précieux !

Merci de compléter ce court questionnaire de satisfaction :
${base}/satisfaction/${satToken}

Une remarque ou une difficulté à nous signaler ? Vous pouvez déposer une
réclamation via ce formulaire (traitée sous 15 jours ouvrés) :
${base}/reclamer/${satToken}

Cordialement,
${orgConfig.representant} — ${orgConfig.name}`;
      await logAndSend({ to, subject, body, sessionId: s.id });
      await prisma.inscription.update({
        where: { id: i.id },
        data: { satisfactionSentAt: new Date() },
      });
      counts.satisfactions++;
    }

    // ── 3bis) SATISFACTION ENTREPRISE (B2B : formation terminée, client pro) ──
    if (
      settings.satisfactionActive &&
      entEmail &&
      !i.satisfactionEntrepriseSentAt &&
      s.dateFin < now
    ) {
      const entToken = i.satisfactionEntrepriseToken ?? generateToken();
      if (!i.satisfactionEntrepriseToken) {
        await prisma.inscription.update({
          where: { id: i.id },
          data: { satisfactionEntrepriseToken: entToken },
        });
      }
      await logAndSend({
        to: entEmail,
        subject: `Votre évaluation de la formation — ${f.titre}`,
        body: `Bonjour,

La formation « ${f.titre} » suivie par votre salarié(e) ${stagiaire} est terminée.

Dans le cadre de notre démarche qualité (Qualiopi), merci de compléter
cette courte évaluation en ligne (à remplir et signer, 3 minutes) :

${base}/satisfaction-entreprise/${entToken}

Une remarque ou une difficulté ? Vous pouvez aussi déposer une réclamation :
${base}/reclamer/${i.satisfactionToken ?? entToken}

Cordialement,
${orgConfig.representant} — ${orgConfig.name}`,
        sessionId: s.id,
      });
      await prisma.inscription.update({
        where: { id: i.id },
        data: { satisfactionEntrepriseSentAt: new Date() },
      });
    }

    // ── 4) DOCUMENTS DE FIN DE FORMATION (terminée, pas déjà envoyés) ──
    if (settings.docsFinActive && !i.docsFinSentAt && s.dateFin < now && i.accessToken) {
      const subject = `Attestation de fin de formation — ${f.titre}`;
      const body = `Bonjour ${prenom},

Félicitations pour avoir suivi la formation « ${f.titre} » (du ${fmt(s.dateDebut)} au ${fmt(s.dateFin)}).

Vous trouverez ci-joint votre attestation de fin de formation (PDF). L'ensemble de vos documents reste disponible ici :
${base}/parcours/${i.accessToken}/documents

Cordialement,
${orgConfig.representant} — ${orgConfig.name}`;
      const finPdf = await buildSingleDocPdf(i.id, "ATTESTATION_FIN");
      await logAndSend({
        to,
        subject,
        body,
        sessionId: s.id,
        attachments: finPdf
          ? [{ name: "Attestation-fin.pdf", content: toBase64(finPdf.data) }]
          : undefined,
      });
      if (entEmail) {
        // B2B : attestation de fin + certificat de réalisation à l'entreprise
        const certPdf = await buildSingleDocPdf(i.id, "CERTIFICAT_REALISATION");
        const pj = [
          ...(finPdf ? [{ name: "Attestation-fin.pdf", content: toBase64(finPdf.data) }] : []),
          ...(certPdf ? [{ name: "Certificat-realisation.pdf", content: toBase64(certPdf.data) }] : []),
        ];
        await logAndSend({
          to: entEmail,
          subject: `Fin de formation de votre salarié — ${f.titre}`,
          body: `Bonjour,

La formation « ${f.titre} » suivie par votre salarié(e) ${stagiaire} s'est achevée le ${fmt(s.dateFin)}.

Vous trouverez en pièces jointes l'attestation de fin de formation et le certificat de réalisation (PDF), pour votre dossier${entNom ? ` (${entNom})` : ""} et votre financeur le cas échéant.

Cordialement,
${orgConfig.representant} — ${orgConfig.name}`,
          sessionId: s.id,
          attachments: pj.length ? pj : undefined,
        });
      }
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
