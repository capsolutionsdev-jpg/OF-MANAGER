import { EmailStatut, DemiJournee, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailConfigured, toBase64, type EmailAttachment } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { orgConfigFor } from "@/lib/org-identity";
import { generateToken, appBaseUrl } from "@/lib/token";
import { DEFAULT_AUTOMATION_SETTINGS, type AutomationSettingsData } from "@/lib/automation-settings";
import { buildSingleDocPdf } from "@/lib/documents/build-pdf";
import {
  effectiveAutomation,
  parseAutomationsConfig,
  type AutomationsConfig,
} from "@/lib/automations";
import {
  emailShell,
  emailLogoSrc,
  emailHeading,
  emailParagraph,
  emailButton,
  emailBox,
  emailSignoff,
  esc,
  PRIMARY,
} from "@/lib/email-templates";

const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

// Jalons datés de l'inscription utilisés comme VERROUS d'idempotence.
type InscMilestone =
  | "convocationSentAt"
  | "rappelSentAt"
  | "convocationExamenSentAt"
  | "attestationEntreeSentAt"
  | "positionnementSentAt"
  | "francaisSentAt"
  | "satisfactionSentAt"
  | "satisfactionEntrepriseSentAt"
  | "docsFinSentAt"
  | "suivi6moisSentAt";

/**
 * Verrou atomique par jalon : pose le champ à `now` UNIQUEMENT s'il est encore
 * null (compare-and-set en une requête). Renvoie true si CE run a obtenu le
 * verrou → empêche deux exécutions concurrentes (cron + bouton manuel) d'envoyer
 * le même e-mail/SMS. Utilisé comme dernière condition d'éligibilité.
 */
async function claimInsc(id: string, field: InscMilestone): Promise<boolean> {
  const r = await prisma.inscription.updateMany({
    where: { id, [field]: null } as unknown as Prisma.InscriptionWhereInput,
    data: { [field]: new Date() } as unknown as Prisma.InscriptionUpdateManyMutationInput,
  });
  return r.count === 1;
}

/** Libère le jalon (remet à null) si l'envoi a échoué → réessai au prochain run. */
async function releaseInsc(id: string, field: InscMilestone): Promise<void> {
  await prisma.inscription.updateMany({
    where: { id },
    data: { [field]: null } as unknown as Prisma.InscriptionUpdateManyMutationInput,
  });
}

/**
 * Génération PDF best-effort : une panne (Chromium serverless…) ne doit pas faire
 * échouer tout le run — d'autant que le jalon est déjà réservé (claimInsc). En cas
 * d'échec, on renvoie null (pièce jointe omise) plutôt que de lever.
 */
async function safePdf(inscriptionId: string, type: string) {
  try {
    return await buildSingleDocPdf(inscriptionId, type);
  } catch (e) {
    console.error(`Automation: génération PDF ${type} échouée (ignorée)`, e);
    return null;
  }
}

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
 * Exécute les automatismes du parcours (idempotent grâce aux jalons datés sur
 * l'inscription).
 * - `orgId` ABSENT → balayage GLOBAL de tous les tenants : réservé au cron
 *   quotidien (`api/cron/parcours`), seul point d'entrée cross-tenant légitime.
 * - `orgId` FOURNI → balayage CLOISONNÉ à cet organisme : utilisé par le
 *   déclencheur manuel (`runAutomationsNow`), qui ne doit jamais toucher les
 *   données d'un autre tenant (audit multi-tenant A05-001).
 */
export async function runAutomations(orgId?: string): Promise<Counts> {
  // Filtre tenant appliqué à CHAQUE balayage quand un organisme est fourni
  // (déclenchement manuel). Vide pour le cron (global).
  const orgWhere = orgId ? { organismeId: orgId } : {};
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

  // Réglages d'automatismes PAR organisme (défauts si l'OF n'a pas encore réglé).
  // Correctif audit : plus de singleton plateforme partagé — chaque tenant a les siens.
  const settingsRows = await prisma.automationSettings.findMany();
  const settingsMap = new Map<string, AutomationSettingsData>();
  for (const r of settingsRows) if (r.organismeId) settingsMap.set(r.organismeId, r);

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
  // Réglages d'automatismes de l'organisme courant (défauts si l'OF n'a rien réglé).
  const stg = (): AutomationSettingsData =>
    (currentOrgId ? settingsMap.get(currentOrgId) : null) ?? { id: "", ...DEFAULT_AUTOMATION_SETTINGS };
  // Envoie un SMS si le canal de l'événement l'inclut (et numéro dispo).
  const maybeSms = async (canal: string, phone: string | null | undefined, text: string) => {
    if ((canal === "sms" || canal === "both") && phone) {
      await sendSms({ to: phone, body: text, organismeId: currentOrgId });
    }
  };
  const logAndSend = async (opts: {
    to: string;
    subject: string;
    body?: string;
    /** Corps HTML habillé (e-mails candidats). Prioritaire sur `body` à l'envoi. */
    html?: string;
    sessionId: string;
    attachments?: EmailAttachment[];
  }) => {
    const res = await sendEmail({
      to: opts.to,
      subject: opts.subject,
      body: opts.body,
      html: opts.html,
      attachments: opts.attachments,
      organismeId: currentOrgId,
    });
    await prisma.emailLog.create({
      data: {
        organismeId: currentOrgId,
        destinataire: opts.to,
        sujet: opts.subject,
        corps: opts.body ?? opts.html ?? opts.subject,
        statut: res.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
        sentAt: res.sent ? new Date() : null,
        sessionId: opts.sessionId,
      },
    });
    // « Enregistrable » = envoi réussi OU e-mail non configuré (mode démo).
    // Un vrai échec (configuré mais non envoyé) renvoie false → le jalon n'est
    // pas posé et l'événement sera retenté au prochain run (pas de perte).
    return res.sent || !emailConfigured();
  };

  const inscriptions = await prisma.inscription.findMany({
    where: { statut: { not: "ANNULEE" }, ...orgWhere },
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
    const convRule = auto("convocation", stg().convocationActive);
    const convLimite = new Date(
      now.getTime() + (convRule.delayDays ?? stg().convocationJMoins) * 24 * 60 * 60 * 1000,
    );
    if (
      convRule.on &&
      i.signedAt &&
      !i.convocationSentAt &&
      s.dateDebut >= now &&
      s.dateDebut <= convLimite &&
      (await claimInsc(i.id, "convocationSentAt"))
    ) {
      const subject = `Votre convocation — ${f.titre} 📅`;
      const infoLines = [
        `📅 <b>Dates</b> : du ${esc(fmt(s.dateDebut))} au ${esc(fmt(s.dateFin))}`,
        s.horaires ? `🕘 <b>Horaires</b> : ${esc(s.horaires)}` : "",
        s.lieu ? `📍 <b>Lieu</b> : ${esc(s.lieu)}` : "",
      ]
        .filter(Boolean)
        .join("<br>");
      const html = emailShell({
        organisme: org.name,
        representant: org.representant,
      logoUrl: emailLogoSrc(org.id, org.logoUrl),
        body:
          emailHeading(`C'est confirmé, ${esc(prenom)} 👍`) +
          emailParagraph(
            `Vous êtes officiellement convoqué(e) à la formation <b>« ${esc(f.titre)} »</b>. Voici l'essentiel à retenir&nbsp;:`,
          ) +
          emailBox(infoLines) +
          emailParagraph(
            `👉 Merci de vous présenter <b>à l'heure</b>, muni(e) d'une <b>pièce d'identité en cours de validité</b>.`,
          ) +
          emailSignoff("À très vite,", org.representant),
      });
      // Canal « SMS uniquement » : on n'envoie pas l'e-mail au candidat (le jalon
      // est déjà réservé ; le SMS part plus bas). L'e-mail à l'entreprise reste envoyé.
      const sent = convRule.channel === "sms" ? true : await logAndSend({ to, subject, html, sessionId: s.id });
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
      if (sent) {
        // Jalon déjà posé par le verrou (claimInsc). SMS lié au même jalon.
        await maybeSms(
          convRule.channel,
          i.candidat.telephone,
          convRule.body ||
            `Convocation ${f.titre} le ${fmt(s.dateDebut)}${s.lieu ? ` à ${s.lieu}` : ""}. ${org.name}`,
        );
        counts.convocations++;
      } else {
        await releaseInsc(i.id, "convocationSentAt"); // échec réel → réessai au prochain run
      }
    }

    // ── 1ter) RAPPEL J-1 (signé, 24h avant le début, pas déjà envoyé) ──
    const rappelRule = auto("rappel", true);
    const dans24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (
      rappelRule.on &&
      i.signedAt &&
      !i.rappelSentAt &&
      s.dateDebut >= now &&
      s.dateDebut <= dans24h &&
      (await claimInsc(i.id, "rappelSentAt"))
    ) {
      const subject = `⏰ Demain, c'est le grand jour : ${f.titre}`;
      const infoLines = [
        `📅 <b>Début</b> : ${esc(fmt(s.dateDebut))}`,
        s.horaires ? `🕘 <b>Horaires</b> : ${esc(s.horaires)}` : "",
        s.lieu ? `📍 <b>Lieu</b> : ${esc(s.lieu)}` : "",
      ]
        .filter(Boolean)
        .join("<br>");
      const html = emailShell({
        organisme: org.name,
        representant: org.representant,
      logoUrl: emailLogoSrc(org.id, org.logoUrl),
        accent: "amber",
        body:
          emailHeading(`Petit rappel, ${esc(prenom)} 🙂`) +
          emailParagraph(
            `Votre formation <b>« ${esc(f.titre)} »</b> démarre <b>demain</b>. On a hâte de vous accueillir&nbsp;!`,
          ) +
          emailBox(infoLines, "amber") +
          emailParagraph(
            `N'oubliez pas votre <b>pièce d'identité</b>. Un empêchement de dernière minute&nbsp;? Répondez à cet e-mail, on s'organise.`,
          ) +
          emailSignoff("À demain,", org.representant),
      });
      const sent = rappelRule.channel === "sms" ? true : await logAndSend({ to, subject, html, sessionId: s.id });
      if (sent) {
        await maybeSms(
          rappelRule.channel,
          i.candidat.telephone,
          rappelRule.body ||
            `Rappel : « ${f.titre} » débute demain ${fmt(s.dateDebut)}${s.horaires ? ` (${s.horaires})` : ""}${s.lieu ? ` à ${s.lieu}` : ""}. ${org.name}`,
        );
        counts.rappels++;
      } else {
        await releaseInsc(i.id, "rappelSentAt");
      }
    }

    // ── 1bis) CONVOCATION À L'EXAMEN (signé, J-7 avant la fin, mail séparé + PDF) ──
    // Uniquement pour les formations soumises à examen (ex. TFP APS) — jamais
    // pour SST / MAC SST / MAC APS.
    const cvxRule = auto("convocation_examen", stg().convocationActive);
    const cvxLimite = new Date(
      now.getTime() + (cvxRule.delayDays ?? stg().convocationJMoins) * 24 * 60 * 60 * 1000,
    );
    if (
      f.examen &&
      cvxRule.on &&
      i.signedAt &&
      !i.convocationExamenSentAt &&
      s.dateFin >= now &&
      s.dateFin <= cvxLimite &&
      (await claimInsc(i.id, "convocationExamenSentAt"))
    ) {
      const subject = `🎯 Convocation à votre examen — ${f.titre}`;
      const lieuExamen = s.lieuExamen ?? s.lieu;
      const infoLines = [
        `📅 <b>Date de l'examen</b> : ${esc(fmt(s.dateExamen ?? s.dateFin))}`,
        s.horaires ? `🕘 <b>Horaires</b> : ${esc(s.horaires)}` : "",
        lieuExamen ? `📍 <b>Lieu</b> : ${esc(lieuExamen)}` : "",
      ]
        .filter(Boolean)
        .join("<br>");
      const html = emailShell({
        organisme: org.name,
        representant: org.representant,
      logoUrl: emailLogoSrc(org.id, org.logoUrl),
        accent: "green",
        body:
          emailHeading(`Dernière ligne droite, ${esc(prenom)} 🎯`) +
          emailParagraph(
            `Vous êtes convoqué(e) à l'<b>épreuve de certification</b> de la formation <b>« ${esc(f.titre)} »</b>.`,
          ) +
          emailBox(infoLines, "green") +
          emailParagraph(
            `📎 Votre <b>convocation officielle (PDF)</b> est en pièce jointe. Présentez-vous muni(e) d'une <b>pièce d'identité en cours de validité</b> — sans elle, l'accès à l'épreuve peut être refusé.`,
          ) +
          emailParagraph(`Vous êtes prêt(e). Faites-vous confiance&nbsp;!`) +
          emailSignoff("Bon courage,", org.representant),
      });
      const cvxPdf = await safePdf(i.id, "CONVOCATION_EXAMEN");
      const sent = await logAndSend({
        to,
        subject,
        html,
        sessionId: s.id,
        attachments: cvxPdf
          ? [{ name: "Convocation-examen.pdf", content: toBase64(cvxPdf.data) }]
          : undefined,
      });
      if (sent) {
        counts.convocationsExamen++;
      } else {
        await releaseInsc(i.id, "convocationExamenSentAt");
      }
    }

    // ── 2) ATTESTATION D'ENTRÉE (J1 atteint, signé, pas déjà envoyée) ──
    if (
      auto("attestation_entree", stg().attestationEntreeActive).on &&
      i.signedAt &&
      !i.attestationEntreeSentAt &&
      s.dateDebut <= now &&
      i.accessToken &&
      (await claimInsc(i.id, "attestationEntreeSentAt"))
    ) {
      const subject = `✅ Votre entrée en formation est confirmée — ${f.titre}`;
      const html = emailShell({
        organisme: org.name,
        representant: org.representant,
      logoUrl: emailLogoSrc(org.id, org.logoUrl),
        body:
          emailHeading(`Bienvenue, ${esc(prenom)} 👋`) +
          emailParagraph(
            `Nous confirmons votre <b>entrée en formation « ${esc(f.titre)} »</b> le <b>${esc(fmt(s.dateDebut))}</b>. C'est parti&nbsp;!`,
          ) +
          emailBox(
            `📎 <b>En pièce jointe</b> : votre attestation d'entrée en formation, signée (PDF).<br>Conservez-la, elle peut vous être demandée (financeur, employeur…).`,
          ) +
          emailParagraph(`Toute l'équipe vous souhaite une excellente formation.`) +
          emailSignoff("Bonne formation,", org.representant),
      });
      const attPdf = await safePdf(i.id, "ATTESTATION_ENTREE");
      const attPj = attPdf
        ? [{ name: "Attestation-entree.pdf", content: toBase64(attPdf.data) }]
        : undefined;
      const sent = await logAndSend({ to, subject, html, sessionId: s.id, attachments: attPj });
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
      if (sent) {
        counts.attestationsEntree++;
      } else {
        await releaseInsc(i.id, "attestationEntreeSentAt");
      }
    }

    // ── 2ter) TEST DE POSITIONNEMENT (1er jour de formation, lien en ligne) ──
    // Envoyé au passage du cron du matin (~9h) le jour du démarrage de la session.
    if (
      auto("positionnement", true).on &&
      !i.positionnementSentAt &&
      s.dateDebut <= now &&
      s.dateFin >= now &&
      (await claimInsc(i.id, "positionnementSentAt"))
    ) {
      const posToken = i.positionnementToken ?? generateToken();
      if (!i.positionnementToken) {
        await prisma.inscription.update({
          where: { id: i.id },
          data: { positionnementToken: posToken },
        });
      }
      const posSubject = `⏱️ 5 minutes pour personnaliser votre formation — ${f.titre}`;
      const posLink = `${base}/positionnement/${posToken}`;
      const posHtml = emailShell({
        organisme: org.name,
        representant: org.representant,
      logoUrl: emailLogoSrc(org.id, org.logoUrl),
        body:
          emailHeading(`Bienvenue dans « ${esc(f.titre)} », ${esc(prenom)} 🎉`) +
          emailParagraph(
            `Avant de démarrer, un <b>court test de positionnement</b> — une dizaine de questions, <b>5 minutes</b> chrono. Il nous permet d'<b>adapter le contenu et le rythme</b> à votre profil.`,
          ) +
          emailButton("Faire le test (5 min) →", posLink) +
          emailBox(
            `✍️ Vos réponses, <b>signées</b>, seront conservées dans votre dossier de formation.`,
          ) +
          emailSignoff("Bonne formation,", org.representant),
      });
      const sent = await logAndSend({ to, subject: posSubject, html: posHtml, sessionId: s.id });
      if (!sent) await releaseInsc(i.id, "positionnementSentAt");
    }

    // ── 2quater) TEST DE FRANÇAIS (1er jour, lien en ligne) ──
    if (
      auto("francais", true).on &&
      !i.francaisSentAt &&
      s.dateDebut <= now &&
      s.dateFin >= now &&
      (await claimInsc(i.id, "francaisSentAt"))
    ) {
      const frToken = i.francaisToken ?? generateToken();
      if (!i.francaisToken) {
        await prisma.inscription.update({
          where: { id: i.id },
          data: { francaisToken: frToken },
        });
      }
      const frSubject = `📝 Petit test de français (10 min) — ${f.titre}`;
      const frLink = `${base}/francais/${frToken}`;
      const frHtml = emailShell({
        organisme: org.name,
        representant: org.representant,
      logoUrl: emailLogoSrc(org.id, org.logoUrl),
        body:
          emailHeading(`Une dernière étape, ${esc(prenom)}`) +
          emailParagraph(
            `Dans le cadre de votre entrée en <b>« ${esc(f.titre)} »</b>, merci de compléter ce <b>court test de français</b> — une quinzaine de questions, environ <b>10 minutes</b>.`,
          ) +
          emailButton("Commencer le test →", frLink) +
          emailBox(
            `✍️ Vos réponses, <b>signées</b>, seront conservées dans votre dossier de formation.`,
          ) +
          emailSignoff("Bonne formation,", org.representant),
      });
      const sent = await logAndSend({ to, subject: frSubject, html: frHtml, sessionId: s.id });
      if (!sent) await releaseInsc(i.id, "francaisSentAt");
    }

    // ── 3) ENQUÊTE DE SATISFACTION (formation terminée, pas déjà envoyée) ──
    const satRule = auto("satisfaction", stg().satisfactionActive);
    if (
      satRule.on &&
      !i.satisfactionSentAt &&
      s.dateFin < now &&
      (await claimInsc(i.id, "satisfactionSentAt"))
    ) {
      const satToken = i.satisfactionToken ?? generateToken();
      if (!i.satisfactionToken) {
        await prisma.inscription.update({
          where: { id: i.id },
          data: { satisfactionToken: satToken },
        });
        i.satisfactionToken = satToken; // garde l'objet local cohérent (réutilisé en 3bis)
      }
      const subject = `💬 Votre avis compte — ${f.titre}`;
      const satLink = `${base}/satisfaction/${satToken}`;
      const reclamerLink = `${base}/reclamer/${satToken}`;
      const html = emailShell({
        organisme: org.name,
        representant: org.representant,
      logoUrl: emailLogoSrc(org.id, org.logoUrl),
        body:
          emailHeading(`Merci d'avoir suivi « ${esc(f.titre)} », ${esc(prenom)} 🙏`) +
          emailParagraph(
            `Votre retour nous est <b>précieux</b> : il nous aide à améliorer nos formations pour les prochains stagiaires. 2 minutes suffisent.`,
          ) +
          emailButton("Donner mon avis (2 min) →", satLink) +
          emailBox(
            `Une remarque ou une difficulté à signaler&nbsp;? Vous pouvez déposer une <b>réclamation</b> ici (traitée sous 15 jours ouvrés)&nbsp;:<br><a href="${esc(reclamerLink)}" style="color:${PRIMARY};font-weight:bold">Déposer une réclamation</a>`,
            "amber",
          ) +
          emailSignoff("Merci encore,", org.representant),
      });
      const sent = satRule.channel === "sms" ? true : await logAndSend({ to, subject, html, sessionId: s.id });
      if (sent) {
        await maybeSms(
          satRule.channel,
          i.candidat.telephone,
          satRule.body || `${prenom}, merci d'évaluer la formation « ${f.titre} » : ${base}/satisfaction/${satToken}`,
        );
        counts.satisfactions++;
      } else {
        await releaseInsc(i.id, "satisfactionSentAt");
      }
    }

    // ── 3bis) SATISFACTION ENTREPRISE (B2B : formation terminée, client pro) ──
    if (
      auto("satisfaction_entreprise", stg().satisfactionActive).on &&
      entEmail &&
      !i.satisfactionEntrepriseSentAt &&
      s.dateFin < now &&
      (await claimInsc(i.id, "satisfactionEntrepriseSentAt"))
    ) {
      const entToken = i.satisfactionEntrepriseToken ?? generateToken();
      if (!i.satisfactionEntrepriseToken) {
        await prisma.inscription.update({
          where: { id: i.id },
          data: { satisfactionEntrepriseToken: entToken },
        });
      }
      const sent = await logAndSend({
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
      if (!sent) await releaseInsc(i.id, "satisfactionEntrepriseSentAt");
    }

    // ── 4) DOCUMENTS DE FIN DE FORMATION (terminée, pas déjà envoyés) ──
    if (
      auto("docs_fin", stg().docsFinActive).on &&
      !i.docsFinSentAt &&
      s.dateFin < now &&
      i.accessToken &&
      (await claimInsc(i.id, "docsFinSentAt"))
    ) {
      const subject = `🎓 Bravo ! Voici votre attestation — ${f.titre}`;
      const docsLink = `${base}/parcours/${i.accessToken}/documents`;
      const html = emailShell({
        organisme: org.name,
        representant: org.representant,
      logoUrl: emailLogoSrc(org.id, org.logoUrl),
        accent: "green",
        body:
          emailHeading(`Félicitations, ${esc(prenom)} 🎓`) +
          emailParagraph(
            `Vous venez de terminer la formation <b>« ${esc(f.titre)} »</b> (du ${esc(fmt(s.dateDebut))} au ${esc(fmt(s.dateFin))}). Beau parcours&nbsp;!`,
          ) +
          emailBox(
            `📎 <b>En pièce jointe</b> : votre attestation de fin de formation (PDF).<br>📂 Tous vos documents restent disponibles ici&nbsp;: <a href="${esc(docsLink)}" style="color:${PRIMARY};font-weight:bold">Accéder à mes documents</a>`,
            "green",
          ) +
          emailSignoff("Encore bravo,", org.representant),
      });
      const finPdf = await safePdf(i.id, "ATTESTATION_FIN");
      const sent = await logAndSend({
        to,
        subject,
        html,
        sessionId: s.id,
        attachments: finPdf
          ? [{ name: "Attestation-fin.pdf", content: toBase64(finPdf.data) }]
          : undefined,
      });
      if (entEmail) {
        // B2B : attestation de fin + certificat de réalisation à l'entreprise
        const certPdf = await safePdf(i.id, "CERTIFICAT_REALISATION");
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
      if (sent) {
        counts.docsFin++;
      } else {
        await releaseInsc(i.id, "docsFinSentAt");
      }
    }

    // ── 4bis) SUIVI À 6 MOIS (Qualiopi ind. 11 — devenir / insertion pro) ──
    const suiviRule = auto("suivi_6mois", true);
    const sixMois = new Date(s.dateFin);
    sixMois.setMonth(sixMois.getMonth() + 6);
    if (
      suiviRule.on &&
      !i.suivi6moisSentAt &&
      now >= sixMois &&
      (await claimInsc(i.id, "suivi6moisSentAt"))
    ) {
      const suiviToken = i.suivi6moisToken ?? generateToken();
      if (!i.suivi6moisToken) {
        await prisma.inscription.update({
          where: { id: i.id },
          data: { suivi6moisToken: suiviToken },
        });
      }
      const subject = `👋 6 mois après « ${f.titre} » — où en êtes-vous ?`;
      const suiviLink = `${base}/suivi/${suiviToken}`;
      const html = emailShell({
        organisme: org.name,
        representant: org.representant,
      logoUrl: emailLogoSrc(org.id, org.logoUrl),
        body:
          emailHeading(`Prenons de vos nouvelles, ${esc(prenom)}`) +
          emailParagraph(
            `Il y a environ 6 mois, vous terminiez <b>« ${esc(f.titre)} »</b>. Dans le cadre de notre démarche qualité, nous aimerions savoir <b>où vous en êtes</b> aujourd'hui (situation professionnelle, lien avec la formation…).`,
          ) +
          emailButton("Répondre (2 min) →", suiviLink) +
          emailBox(
            `✍️ Un court questionnaire à compléter et signer. Vos réponses nous aident à améliorer nos formations.`,
          ) +
          emailSignoff("Merci pour votre temps,", org.representant),
      });
      const sent = suiviRule.channel === "sms" ? true : await logAndSend({ to, subject, html, sessionId: s.id });
      if (sent) {
        await maybeSms(
          suiviRule.channel,
          i.candidat.telephone,
          suiviRule.body ||
            `${prenom}, 2 min pour nous dire où vous en êtes 6 mois après « ${f.titre} » : ${base}/suivi/${suiviToken}`,
        );
      } else {
        await releaseInsc(i.id, "suivi6moisSentAt");
      }
    }
  }

  // ── 5) COMPTE-RENDU FORMATEUR (session terminée, formateur avec e-mail, non envoyé) ──
  const sessionsTerminees = await prisma.session.findMany({
    where: {
      statut: { not: "ANNULEE" },
      dateFin: { lt: now },
      crFormateurSentAt: null,
      ...orgWhere,
    },
    include: { formation: true, formateurs: true },
  });

  for (const s of sessionsTerminees) {
    currentOrgId = s.organismeId;
    if (!auto("compte_rendu", stg().compteRenduActive).on) continue;
    const org = await orgConfigFor(s.organismeId);
    const f = s.formateurs[0];
    if (!f?.email) continue;
    // Verrou atomique : réserve l'envoi (évite le double envoi concurrent).
    const crClaimed = (await prisma.session.updateMany({
      where: { id: s.id, crFormateurSentAt: null },
      data: { crFormateurSentAt: new Date() },
    })).count === 1;
    if (!crClaimed) continue;
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
    const sent = await logAndSend({ to: f.email, subject, body, sessionId: s.id });
    if (sent) {
      counts.compteRendus++;
    } else {
      await prisma.session.updateMany({ where: { id: s.id }, data: { crFormateurSentAt: null } });
    }
  }

  // ── 6) ÉMARGEMENT DU JOUR (matin avant 13h, après-midi ensuite) ──
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);
  const demiNow = now.getHours() < 13 ? DemiJournee.MATIN : DemiJournee.APRES_MIDI;
  const demiLabel = demiNow === DemiJournee.MATIN ? "matin" : "après-midi";

  const emargs = await prisma.emargementSignature.findMany({
    where: { date: { gte: startToday, lt: endToday }, demi: demiNow, sentAt: null, ...orgWhere },
    include: { session: { include: { formation: true } } },
  });

  for (const e of emargs) {
    currentOrgId = e.organismeId;
    const emRule = auto("emargement", stg().emargementActive);
    if (!emRule.on) continue;
    // Verrou atomique : réserve l'envoi (évite le double envoi concurrent).
    const emClaimed = (await prisma.emargementSignature.updateMany({
      where: { id: e.id, sentAt: null },
      data: { sentAt: new Date() },
    })).count === 1;
    if (!emClaimed) continue;
    const org = await orgConfigFor(e.organismeId);
    const link = `${base}/emarger/${e.token}`;
    const subject = `✍️ Signez votre présence (${demiLabel}) — ${e.session.formation.titre}`;
    const html = emailShell({
      organisme: org.name,
      representant: org.representant,
      logoUrl: emailLogoSrc(org.id, org.logoUrl),
      body:
        emailParagraph(`Bonjour ${esc(e.nom)},`) +
        emailParagraph(
          `Merci de <b>signer votre présence</b> (${esc(demiLabel)}) à la formation <b>« ${esc(e.session.formation.titre)} »</b>. Un clic suffit&nbsp;:`,
        ) +
        emailButton("Signer mon émargement →", link) +
        emailBox(
          `👆 La signature se fait directement avec votre <b>doigt</b> (mobile) ou votre <b>souris</b> (ordinateur).`,
        ) +
        emailSignoff("Merci,", org.representant),
    });
    const sent = await logAndSend({ to: e.email, subject, html, sessionId: e.sessionId });
    if (sent) {
      counts.emargements++;
    } else {
      await prisma.emargementSignature.updateMany({ where: { id: e.id }, data: { sentAt: null } });
    }
  }

  return counts;
}
