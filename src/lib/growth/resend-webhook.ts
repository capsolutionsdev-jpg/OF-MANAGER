import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Utilitaires webhook Resend (tracking e-mail → timeline growth).
 * Resend envoie des événements signés avec Svix (en-têtes svix-id /
 * svix-timestamp / svix-signature) et un payload `{ type, data: {...} }`.
 * Format doc : https://resend.com/docs/dashboard/webhooks/introduction
 */

// Événements Resend → type de LeadEvent (cf. lib/growth/events.ts).
export const RESEND_EVENT_MAP: Record<string, "email_ouvert" | "email_clic"> = {
  "email.opened": "email_ouvert",
  "email.clicked": "email_clic",
};

// Anti-inflation du score : un même type d'événement n'est compté qu'une fois
// par lead sur cette fenêtre (un prospect qui rouvre 15 fois ≠ 15 signaux).
export const EMAIL_DEDUP_WINDOW_MS = 24 * 60 * 60_000;

// Tolérance d'horodatage Svix (anti-rejeu) : on refuse un événement trop ancien
// ou trop dans le futur.
const SVIX_TOLERANCE_MS = 10 * 60_000;

export type ResendEmailEvent = {
  type: "email_ouvert" | "email_clic";
  email: string;
  link: string | null;
  subject: string | null;
};

/**
 * Extrait l'événement e-mail exploitable d'un payload Resend, ou null si le type
 * n'est pas suivi (delivered, bounced…) ou si le destinataire est absent.
 */
export function parseResendEmailEvent(body: unknown): ResendEmailEvent | null {
  const b = (body ?? {}) as { type?: unknown; data?: Record<string, unknown> };
  const type = RESEND_EVENT_MAP[String(b.type ?? "")];
  if (!type) return null;

  const data = (b.data ?? {}) as {
    to?: unknown;
    subject?: unknown;
    click?: { link?: unknown };
  };
  const to = Array.isArray(data.to) ? data.to[0] : data.to;
  const email = String(to ?? "").trim().toLowerCase();
  if (!email) return null;

  const link = String(data.click?.link ?? "").slice(0, 300) || null;
  const subject = String(data.subject ?? "").slice(0, 200) || null;
  return { type, email, link, subject };
}

/**
 * Vérifie la signature Svix d'un webhook Resend.
 * `secret` = secret de signature du dashboard Resend (format « whsec_<base64> »).
 * `rawBody` DOIT être le corps brut (non re-sérialisé). `now` injectable (tests).
 */
export function verifySvixSignature(
  opts: { secret: string; id: string; timestamp: string; signature: string; rawBody: string },
  now: number = Date.now(),
): boolean {
  const { secret, id, timestamp, signature, rawBody } = opts;
  if (!secret || !id || !timestamp || !signature) return false;

  // Anti-rejeu : l'horodatage (secondes UNIX) doit être dans la fenêtre tolérée.
  const tsSec = Number(timestamp);
  if (!Number.isFinite(tsSec) || Math.abs(now - tsSec * 1000) > SVIX_TOLERANCE_MS) return false;

  let key: Buffer;
  try {
    key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  } catch {
    return false;
  }
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest("base64");
  const expectedBuf = Buffer.from(expected);

  // L'en-tête peut contenir plusieurs signatures « v1,<sig> » séparées par des espaces.
  return signature.split(" ").some((part) => {
    const sig = part.includes(",") ? part.slice(part.indexOf(",") + 1) : part;
    if (!sig) return false;
    const sigBuf = Buffer.from(sig);
    return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
  });
}
