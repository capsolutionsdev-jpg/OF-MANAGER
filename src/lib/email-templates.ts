// Gabarits d'e-mails candidats — charte OFManager, white-label par organisme.
// Tables + styles inline → compatibles Gmail / Outlook / Apple Mail.
// Porté de docs/emails-candidats-galerie.html.
//
// ⚠️ SÉCURITÉ : toute valeur dynamique (prénom, titre de formation, lien…) DOIT
// passer par esc() avant insertion dans le HTML (sinon un « & » ou « < » casse la
// mise en page et ouvre une faille d'injection).

import { appBaseUrl } from "@/lib/token";

export const NAVY = "#0D1B3E";
export const PRIMARY = "#3B6EF5";
export const AMBER = "#E8A33D";
export const GREEN = "#12B886";
export const MUTED = "#5b6b86";
export const LINE = "#e3e9f4";
export const PAPER = "#f5f8fd";
export const INK = "#33415c";

export type EmailAccent = "primary" | "amber" | "green";
const ACCENT: Record<EmailAccent, string> = { primary: PRIMARY, amber: AMBER, green: GREEN };

/** Échappe une valeur dynamique pour une insertion HTML sûre. */
export function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Style d'un paragraphe standard (à réutiliser en inline si besoin). */
export const EMAIL_P = "margin:0 0 16px;font-size:15px;line-height:1.65;color:#33415c";

/** Titre principal (h1). `text` peut contenir des emoji + du HTML déjà échappé. */
export function emailHeading(text: string): string {
  return `<h1 style="margin:0 0 14px;font-size:22px;color:${NAVY};font-family:Arial">${text}</h1>`;
}

/** Paragraphe. `html` peut contenir des balises inline (<b>, <a>…) ; échappez les valeurs dynamiques. */
export function emailParagraph(html: string): string {
  return `<p style="${EMAIL_P}">${html}</p>`;
}

/** CTA principal centré. `label` est échappé, `href` doit être une URL de confiance. */
export function emailButton(label: string, href: string, accent: EmailAccent = "primary"): string {
  const color = ACCENT[accent];
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 22px"><tr>` +
    `<td style="border-radius:10px;background:${color}">` +
    `<a href="${esc(href)}" style="display:inline-block;padding:14px 30px;font-family:Arial;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px">${esc(label)}</a>` +
    `</td></tr></table>`
  );
}

/** Encadré d'information (dates, identifiants, PJ…). `inner` = HTML (échappez le dynamique). */
export function emailBox(inner: string, accent: EmailAccent = "primary"): string {
  const color = ACCENT[accent];
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};border:1px solid ${LINE};border-left:4px solid ${color};border-radius:10px;margin:6px 0 22px">` +
    `<tr><td style="padding:16px 20px;font-size:14px;color:${INK};line-height:1.6">${inner}</td></tr></table>`
  );
}

/** Ligne de signature (formule + représentant, échappés). */
export function emailSignoff(closing: string, representant: string): string {
  return `<p style="margin:6px 0 0;font-size:15px;color:${INK}">${esc(closing)}<br><b>${esc(representant)}</b></p>`;
}

/**
 * URL HTTPS du logo d'un organisme pour un e-mail (via l'endpoint public qui
 * décode le logo). `null` si l'organisme n'a pas de logo → l'en-tête retombe sur
 * la pastille 🎓. NB : on ne met JAMAIS le `data:` base64 brut dans un e-mail
 * (bloqué par Gmail/Outlook).
 */
export function emailLogoSrc(
  organismeId: string | null | undefined,
  orgLogoUrl: string | null | undefined,
): string | null {
  if (!organismeId || !orgLogoUrl) return null;
  return `${appBaseUrl()}/api/public/organisme/${organismeId}/logo`;
}

/**
 * Assemble l'e-mail complet : en-tête white-label (logo de l'OF ou pastille 🎓 +
 * organisme, lien « Espace candidat » vers la connexion), contenu, pied de page
 * (organisme — représentant + mention RGPD « Propulsé par OFManager »).
 */
export function emailShell(opts: {
  organisme: string;
  representant: string;
  accent?: EmailAccent;
  /** URL HTTPS du logo (cf. emailLogoSrc). Absent → pastille 🎓. */
  logoUrl?: string | null;
  /** Contenu HTML (paragraphes, encadrés, boutons…). */
  body: string;
}): string {
  const accent = ACCENT[opts.accent ?? "primary"];
  const org = esc(opts.organisme);
  const rep = esc(opts.representant);
  const loginUrl = `${appBaseUrl()}/login`;
  const brandMark = opts.logoUrl
    ? `<img src="${esc(opts.logoUrl)}" alt="${org}" height="34" style="height:34px;max-height:34px;width:auto;display:inline-block;vertical-align:middle;border:0;margin-right:10px;background:#ffffff;border-radius:6px;padding:3px 5px">`
    : `<span style="display:inline-block;width:30px;height:30px;background:${accent};border-radius:7px;text-align:center;line-height:30px;font-size:15px;margin-right:9px">🎓</span>`;
  return (
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>` +
    `<body style="margin:0;background:#eef1f7;font-family:Arial,Helvetica,sans-serif;color:#0f1729">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f7;padding:24px 12px"><tr><td align="center">` +
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${LINE}">` +
    `<tr><td style="background:${NAVY};padding:20px 30px"><table role="presentation" width="100%"><tr>` +
    `<td style="font-size:19px;font-weight:bold;color:#ffffff;font-family:Arial">` +
    `${brandMark}${org}</td>` +
    `<td align="right"><a href="${esc(loginUrl)}" style="color:#aab8d8;font-size:12px;text-decoration:none;font-family:Arial">Espace candidat →</a></td></tr></table></td></tr>` +
    `<tr><td style="padding:32px 30px 4px">${opts.body}</td></tr>` +
    `<tr><td style="background:${PAPER};padding:20px 30px;border-top:1px solid ${LINE}">` +
    `<p style="margin:0 0 6px;font-size:12px;color:${MUTED};line-height:1.6"><b style="color:${NAVY}">${org}</b> — ${rep}<br>` +
    `Cet e-mail vous est adressé dans le cadre de votre formation. Une question&nbsp;? Répondez simplement à ce message.</p>` +
    `<p style="margin:0;font-size:11px;color:#9aa7c2">🔒 Données traitées conformément au RGPD · Propulsé par OFManager</p>` +
    `</td></tr></table></td></tr></table></body></html>`
  );
}
