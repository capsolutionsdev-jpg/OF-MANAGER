import { z } from "zod";

/**
 * Validation du SIRET (14 chiffres) — utilisé partout où un SIRET alimente un
 * document officiel (convention, contrat, facture). Un SIRET erroné y provoque
 * un rejet OPCO ou une re-signature : mieux vaut le refuser à la saisie.
 *
 * Règle : 14 chiffres + clé de contrôle de Luhn sur l'ensemble.
 */

/** Ne garde que les chiffres (tolère les espaces de saisie « 732 829 320 00074 »). */
export function normalizeSiret(input: string): string {
  return input.replace(/\D/g, "");
}

/** Clé de Luhn : somme pondérée, un chiffre sur deux doublé depuis la droite. */
function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Vrai si `input` est un SIRET valide (14 chiffres + clé de Luhn). */
export function isValidSiret(input: string): boolean {
  const s = normalizeSiret(input);
  // Luhn seul accepte « 00000000000000 » (somme nulle) : on rejette ce cas,
  // le SIREN 000000000 n'existant pas.
  if (s.length !== 14 || /^0+$/.test(s)) return false;
  return luhnValid(s);
}

const SIRET_ERR = "SIRET invalide — attendu : 14 chiffres (clé de contrôle erronée).";

/** Schéma zod : SIRET optionnel mais, s'il est renseigné, il doit être valide. */
export const siretOptionalSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || isValidSiret(v), SIRET_ERR);

/** Message d'erreur réutilisable pour les validations manuelles (server actions). */
export const SIRET_ERROR_MESSAGE = SIRET_ERR;
