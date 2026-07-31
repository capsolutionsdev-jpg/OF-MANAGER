import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Hachage de la date de naissance pour la vérification anti-fraude.
 *
 * La date de naissance est une CLÉ DE COMPARAISON, jamais une donnée stockée en
 * clair ni exposée. On conserve `SHA-256(dob + selUnique)` avec un sel aléatoire
 * unique par enregistrement (jamais SHA-256 seul → interdit le rainbow-table).
 */

/** Clé stable jour-mois-année (UTC) : « 1990-05-14 ». */
export function dobKey(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) throw new Error("Date de naissance invalide.");
  return dt.toISOString().slice(0, 10);
}

/** Sel aléatoire (hex) à générer une fois par enregistrement. */
export function genSel(): string {
  return randomBytes(16).toString("hex");
}

/** Hash salé de la date de naissance (hex). */
export function hashDob(dob: Date | string, sel: string): string {
  return createHash("sha256").update(`${dobKey(dob)}:${sel}`).digest("hex");
}

/**
 * Compare une date de naissance saisie au hash stocké, à TEMPS CONSTANT
 * (évite un canal d'énumération par timing).
 */
export function verifyDob(input: Date | string, sel: string, expectedHash: string): boolean {
  let got: Buffer;
  try {
    got = Buffer.from(hashDob(input, sel), "hex");
  } catch {
    return false;
  }
  const exp = Buffer.from(expectedHash, "hex");
  return got.length === exp.length && timingSafeEqual(got, exp);
}
