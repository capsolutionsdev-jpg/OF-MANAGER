// Contenu (pur) de l'e-mail d'enquête de suivi à 6 mois — Qualiopi indicateur 11.
// Séparé du module d'envoi (suivi6mois-mailer.ts) pour rester testable sans base
// et garantir UN SEUL modèle d'e-mail, partagé par le cron et les envois manuels.
import {
  emailShell,
  emailHeading,
  emailParagraph,
  emailButton,
  emailBox,
  emailSignoff,
  emailLogoSrc,
  esc,
} from "@/lib/email-templates";

export type Suivi6MoisEmailOpts = {
  organisme: string;
  representant: string;
  logoUrl?: string | null;
  orgId: string | null;
  prenom: string;
  titreFormation: string;
  lien: string;
  relance: boolean;
};

/** Construit le sujet + le corps HTML de l'e-mail d'enquête 6 mois.
 *  `relance = true` → variante « rappel » (sujet distinct), même lien. */
export function buildSuivi6MoisEmailContent(opts: Suivi6MoisEmailOpts): {
  subject: string;
  html: string;
} {
  const { organisme, representant, logoUrl, orgId, prenom, titreFormation, lien, relance } = opts;

  const subject = relance
    ? `⏳ Rappel — 6 mois après « ${titreFormation} », donnez-nous de vos nouvelles`
    : `👋 6 mois après « ${titreFormation} » — où en êtes-vous ?`;

  const intro = relance
    ? emailParagraph(
        `Nous vous avions sollicité·e il y a quelque temps au sujet de votre situation, 6 mois après <b>« ${esc(titreFormation)} »</b>. Votre réponse compte beaucoup pour nous — elle ne prend que <b>2 minutes</b>.`,
      )
    : emailParagraph(
        `Il y a environ 6 mois, vous terminiez <b>« ${esc(titreFormation)} »</b>. Dans le cadre de notre démarche qualité, nous aimerions savoir <b>où vous en êtes</b> aujourd'hui (situation professionnelle, lien avec la formation…).`,
      );

  const html = emailShell({
    organisme,
    representant,
    logoUrl: emailLogoSrc(orgId, logoUrl ?? null),
    body:
      emailHeading(relance ? `Un petit rappel, ${esc(prenom)}` : `Prenons de vos nouvelles, ${esc(prenom)}`) +
      intro +
      emailButton("Répondre (2 min) →", lien) +
      emailBox(
        `✍️ Un court questionnaire à compléter et signer. Vos réponses nous aident à améliorer nos formations.`,
      ) +
      emailSignoff("Merci pour votre temps,", representant),
  });

  return { subject, html };
}
