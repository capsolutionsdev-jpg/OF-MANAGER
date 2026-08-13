import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * « Émargement en salle » — un QR affiché en salle renvoie vers une page
 * publique qui liste les présences à signer du jour. Cette page est protégée
 * par un jeton non devinable dérivé de l'id de session (HMAC), pour ne pas
 * exposer la liste des participants à n'importe qui via l'id seul.
 *
 * Fonctions pures → testables sans base ni requête.
 */

function secret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-emargement-salle-secret";
}

/** Jeton salle non devinable pour une session (24 car. base64url). */
export function salleToken(sessionId: string, key: string = secret()): string {
  return createHmac("sha256", key).update(`emarge-salle:${sessionId}`).digest("base64url").slice(0, 24);
}

/** Vérifie un jeton salle en temps constant. */
export function verifySalleToken(sessionId: string, token: string, key: string = secret()): boolean {
  const expected = salleToken(sessionId, key);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export type Demi = "MATIN" | "APRES_MIDI";

/** Demi-journée « en cours » selon l'heure (avant 13h → matin). */
export function demiEnCours(now: Date): Demi {
  return now.getHours() < 13 ? "MATIN" : "APRES_MIDI";
}

/** Deux dates tombent-elles le même jour civil ? */
export function memeJour(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Clé de jour (YYYY-MM-DD) en heure locale, pour comparer/filtrer. */
export function jourKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
