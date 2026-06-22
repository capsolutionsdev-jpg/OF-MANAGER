import { EmailStatut, DemiJournee } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail, toBase64, type EmailAttachment } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { orgConfigFor } from "@/lib/org-identity";
import { generateToken, appBaseUrl } from "@/lib/token";
import { getAutomationSettings } from "@/lib/automation-settings";
import { buildSingleDocPdf } from "@/lib/documents/build-pdf";
import {
  effectiveAutomation,
  parseAutomationsConfig,
  type AutomationsConfig,
} from "@/lib/automations";

const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

type Counts = {
  convocations: number;
  rappels: number;
  convocationsExamen: number;
  attestationsEntree: number;
  satisfactions: number;
  docsFin: number;
  compteRendus: number;
  emargements: number;
};

/**
 * Exécute tous les automatismes du parcours (idempotent grâce aux jalons
 * datés sur l'inscription). Appelé par le cron quotidien ou manuellement.
 */
export async function runAutomations(): Promise<Counts> {
  const now = new Date();
  const base = appBaseUrl();
  const counts: Counts = {
    convocations: 0,
    rappels: 0,
    convocationsExamen: 0,
    attestationsEntree: 0,
    satisfactions: 0,
    docsFin: 0,
    compteRendus: 0,
    emargements: 0,
  };

  const settings = await getAutomationSettings();

  // Matrice d'automatisations PAR organisme (quoi/quand/canal). Préchargée.
  const orgs = await prisma.organisme.findMany({ select: { id: true, automationsConfig: true } });
  const cfgMap = new Map<string, AutomationsConfig>();
  for (const o of orgs) cfgMap.set(o.id, parseAutomationsConfig(o.automationsConfig));

  // Organisme courant (positionné au début de chaque boucle) → expéditeur Brevo
  // par tenant + organismeId sur le journal d'e-mails.
  let currentOrgId: string | null = null;
  // Config effective d'un événement pour l'organisme courant (matrice OF → repli global).
  const auto = (key: string, fallbackOn: boolean) =>
    effectiveAutomation(currentOrgId ? cfgMap.get(currentOrgId) : null, key, fallbackOn);
  // Envoie un SMS si le canal de l'événement l'inclut (et numéro dispo).
  const maybeSms = async (canal: string, phone: string | null | undefined, text: string) => {
    if ((canal === "sms" || canal === "both") && phone) {
      await sendSms({ to: phone, body: text, organismeId: currentOrgId });
    }
  };
  const logAndSend = async (opts: {
    to: string;
    subject: string;
    body: string;
    sessionId: string;
    attachments?: EmailAttachment[];
  }) => {
    const res = await sendEmail({
      to: opts.to,
      subject: opts.subject,
      body: opts.body,
      attachments: opts.attachments,
      organismeId: currentOrgId,
    });
    await prisma.emailLog.create({
      data: {
        organismeId: currentOrgId,
        destinataire: opts.to,
        sujet: opts.subject,
        corps: opts.body,
        statut: res.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
        sentAt: res.sent ? new Date() : null,
        sessionId: opts.sessionId,
      },
    });
    return res.sent;
  };

  const inscriptions = await prisma.inscription.findMany({
    where: { statut: { not: "ANNULEE" } },
    include: { candidat: { include: { entreprise: true } }, session: { include: { formation: true } } },
  });

  for (const i of inscriptions) {
    currentOrgId = i.organismeId;
    const org = await orgConfigFor(i.organismeId);
    const s = i.session;
    const f = s.formation;
    const to = i.candidat.email;
    const prenom = i.candidat.prenom;
    // Client professionnel : copies des documents à l'entreprise (B2B)
    const entEmail = i.candidat.entreprise?.contactEmail ?? null;
    const entNom = i.candidat.entreprise?.raisonSociale ?? "";
    const stagiaire = `${i.candidat.prenom} ${i.candidat.nom}`;

    // ── 1) CONVOCATION (signé, J-n configurable, pas déjà envoyée, session à venir) ──
    const convRule = auto("convocation", settings.convocationActive);
    const convLimite = new Date(
      now.getTime() + (convRule.delayDays ?? settings.convocationJMoins) * 24 * 60 * 60 * 1000,
    );
    if (
      convRule.on &&
      i.signedAt &&
      !i.convocationSentAt &&
      s.dateDebut >= now &&
      s.dateDebut <= convLimite
    ) {
      const subject = `Convocation — ${f.titre}`;
      const body = `Bonjour ${prenom},

Vous êtes convoqué(e) à la formation « ${f.titre} », du ${fmt(s.dateDebut)} au ${fmt(s.dateFin)}${s.horaires ? ` (${s.horaires})` : ""}${s.lieu ? `, à ${s.lieu}` : ""}.

Merci de vous présenter muni(e) d'une pièce d'identité.

Cordialement,
${org.representant} — ${org.name}`;
      await logAndSend({ to, subject, body, sessionId: s.id });
      if (entEmail) {
        await logAndSend({
          to: entEmail,
          subject: `Convocation de votre salarié — ${f.titre}`,
          body: `Bonjour,

Votre salarié(e) ${stagiaire} est convoqué(e) à la formation « ${f.titre} », du ${fmt(s.dateDebut)} au ${fmt(s.dateFin)}${s.horaires ? ` (${s.horaires})` : ""}${s.lieu ? `, à ${s.lieu}` : ""}.

Cordialement,
${org.representant} — ${org.name}`,
          sessionId: s.id,
        });
      }
      await maybeSms(
        convRule.channel,
        i.candidat.telephone,
        convRule.body ||
          `Convocation ${f.titre} le ${fmt(s.dateDebut)}${s.lieu ? ` à ${s.lieu}` : ""}. ${org.name}`,
      );
      await prisma.inscription.update({
        where: { id: i.id },
        data: { convocationSentAt: new Date() },
      });
      counts.convocations++;
    }

    // ── 1ter) RAPPEL J-1 (signé, 24h avant le début, pas déjà envoyé) ──
    const rappelRule = auto("rappel", true);
    const dans24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (
      rappelRule.on &&
      i.signedAt &&
      !i.rappelSentAt &&
      s.dateDebut >= now &&
      s.dateDebut <= dans24h
    ) {
      const subject = `Rappel — votre formation « ${f.titre} » commence demain`;
      const body = `Bonjour ${prenom},

Petit rappel : votre formation « ${f.titre} » débute le ${fmt(s.dateDebut)}${s.horaires ? ` (${s.horaires})` : ""}${s.lieu ? `, à ${s.lieu}` : ""}.

Merci de vous présenter à l'heure, muni(e) d'une pièce d'identité.

À demain,
${org.representant} — ${org.name}`;
      await logAndSend({ to, subject, body, sessionId: s.id });
      await maybeSms(
        rappelRule.channel,
        i.candidat.telephone,
        rappelRule.body ||
          `Rappel : « ${f.titre} » débute demain ${fmt(s.dateDebut)}${s.horaires ? ` (${s.horaires})` : ""}${s.lieu ? ` à ${s.lieu}` : ""}. ${org.name}`,
      );
      await prisma.inscription.update({
        where: { id: i.id },
        data: { rappelSentAt: new Date() },
      });
      counts.rappels++;
    }

    // ── 1bis) CONVOCATION À L'EXAMEN (signé, J-7 avant la fin, mail séparé + PDF) ──
    // Uniquement pour les formations soumises à examen (ex. TFP APS) — jamais
    // pour SST / MAC SST / MAC APS.
    const cvxRule = auto("convocation_examen", settings.convocationActive);
    const cvxLimite = new Date(
      now.getTime() + (cvxRule.delayDays ?? settings.convocationJMoins) * 24 * 60 * 60 * 1000,
    );
    if (
      f.examen &&
      cvxRule.on &&
      i.signedAt &&
      !i.convocationExamenSentAt &&
      s.dateFin >= now &&
      s.dateFin <= cvxLimite
    ) {
      const subject = `Convocation à l'examen — ${f.titre}`;
      const body = `Bonjour ${prenom},

Vous êtes convoqué(e) à l'épreuve de certification de la formation « ${f.titre} », prévue le ${fmt(s.dateExamen ?? s.dateFin)}${s.horaires ? ` (${s.horaires})` : ""}${(s.lieuExamen ?? s.lieu) ? `, à ${s.lieuExamen ?? s.lieu}` : ""}.

Vous trouverez votre convocation à l'examen en pièce jointe (PDF). Merci de vous présenter muni(e) d'une pièce d'identité en cours de validité.

Cordialement,
${org.representant} — ${org.name}`;
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
      auto("attestation_entree", settings.attestationEntreeActive).on &&
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
${org.representant} — ${org.name}`;
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
${org.representant} — ${org.name}`,
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
    if (auto("positionnement", true).on && !i.positionnementSentAt && s.dateDebut <= now && s.dateFin >= now) {
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
${org.representant} — ${org.name}`;
      await logAndSend({ to, subject: posSubject, body: posBody, sessionId: s.id });
      await prisma.inscription.update({
        where: { id: i.id },
        data: { positionnementSentAt: new Date() },
      });
    }

    // ── 3) ENQUÊTE DE SATISFACTION (formation terminée, pas déjà envoyée) ──
    const satRule = auto("satisfaction", settings.satisfactionActive);
    if (satRule.on && !i.satisfactionSentAt && s.dateFin < now) {
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
${org.representant} — ${org.name}`;
      await logAndSend({ to, subject, body, sessionId: s.id });
      await maybeSms(
        satRule.channel,
        i.candidat.telephone,
        satRule.body || `${prenom}, merci d'évaluer la formation « ${f.titre} » : ${base}/satisfaction/${satToken}`,
      );
      await prisma.inscription.update({
        where: { id: i.id },
        data: { satisfactionSentAt: new Date() },
      });
      counts.satisfactions++;
    }

    // ── 3bis) SATISFACTION ENTREPRISE (B2B : formation terminée, client pro) ──
    if (
      auto("satisfaction_entreprise", settings.satisfactionActive).on &&
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
${org.representant} — ${org.name}`,
        sessionId: s.id,
      });
      await prisma.inscription.update({
        where: { id: i.id },
        data: { satisfactionEntrepriseSentAt: new Date() },
      });
    }

    // ── 4) DOCUMENTS DE FIN DE FORMATION (terminée, pas déjà envoyés) ──
    if (auto("docs_fin", settings.docsFinActive).on && !i.docsFinSentAt && s.dateFin < now && i.accessToken) {
      const subject = `Attestation de fin de formation — ${f.titre}`;
      const body = `Bonjour ${prenom},

Félicitations pour avoir suivi la formation « ${f.titre} » (du ${fmt(s.dateDebut)} au ${fmt(s.dateFin)}).

Vous trouverez ci-joint votre attestation de fin de formation (PDF). L'ensemble de vos documents reste disponible ici :
${base}/parcours/${i.accessToken}/documents

Cordialement,
${org.representant} — ${org.name}`;
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
${org.representant} — ${org.name}`,
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

    // ── 4bis) SUIVI À 6 MOIS (Qualiopi ind. 11 — devenir / insertion pro) ──
    const suiviRule = auto("suivi_6mois", true);
    const sixMois = new Date(s.dateFin);
    sixMois.setMonth(sixMois.getMonth() + 6);
    if (suiviRule.on && !i.suivi6moisSentAt && now >= sixMois) {
      const suiviToken = i.suivi6moisToken ?? generateToken();
      if (!i.suivi6moisToken) {
        await prisma.inscription.update({
          where: { id: i.id },
          data: { suivi6moisToken: suiviToken },
        });
      }
      const subject = `Et 6 mois après ? Votre suivi — ${f.titre}`;
      const body = `Bonjour ${prenom},

Il y a environ 6 mois, vous terminiez la formation « ${f.titre} ». Dans le cadre de notre démarche qualité (Qualiopi), nous aimerions savoir où vous en êtes aujourd'hui (situation professionnelle, lien avec la formation…).

Merci de répondre à ce court questionnaire (2 minutes) et de le signer :
${base}/suivi/${suiviToken}

Vos réponses nous aident à améliorer nos formations.

Cordialement,
${org.representant} — ${org.name}`;
      await logAndSend({ to, subject, body, sessionId: s.id });
      await maybeSms(
        suiviRule.channel,
        i.candidat.telephone,
        suiviRule.body ||
          `${prenom}, 2 min pour nous dire où vous en êtes 6 mois après « ${f.titre} » : ${base}/suivi/${suiviToken}`,
      );
      await prisma.inscription.update({
        where: { id: i.id },
        data: { suivi6moisSentAt: new Date() },
      });
    }
  }

  // ── 5) COMPTE-RENDU FORMATEUR (session terminée, formateur avec e-mail, non envoyé) ──
  const sessionsTerminees = await prisma.session.findMany({
    where: {
      statut: { not: "ANNULEE" },
      dateFin: { lt: now },
      crFormateurSentAt: null,
    },
    include: { formation: true, formateurs: true },
  });

  for (const s of sessionsTerminees) {
    currentOrgId = s.organismeId;
    if (!auto("compte_rendu", settings.compteRenduActive).on) continue;
    const org = await orgConfigFor(s.organismeId);
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
${org.representant} — ${org.name}`;
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

  const emargs = await prisma.emargementSignature.findMany({
    where: { date: { gte: startToday, lt: endToday }, demi: demiNow, sentAt: null },
    include: { session: { include: { formation: true } } },
  });

  for (const e of emargs) {
    currentOrgId = e.organismeId;
    const emRule = auto("emargement", settings.emargementActive);
    if (!emRule.on) continue;
    const org = await orgConfigFor(e.organismeId);
    const link = `${base}/emarger/${e.token}`;
    const subject = `Émargement ${demiLabel} — ${e.session.formation.titre}`;
    const body = `Bonjour ${e.nom},

Merci de signer votre présence (${demiLabel}) à la formation « ${e.session.formation.titre} » en cliquant sur ce lien :
${link}

Cordialement,
${org.representant} — ${org.name}`;
    await logAndSend({ to: e.email, subject, body, sessionId: e.sessionId });
    await prisma.emargementSignature.update({
      where: { id: e.id },
      data: { sentAt: new Date() },
    });
    counts.emargements++;
  }

  return counts;
}
