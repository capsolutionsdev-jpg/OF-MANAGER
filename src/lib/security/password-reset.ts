// Cœur cryptographique du parcours « mot de passe oublié » (§sécurité).
// Module PUR : pas de base, pas de réseau → testable en isolation.
//
// Choix de sécurité (max) :
//  - jeton à 256 bits (non devinable) transmis UNIQUEMENT dans le lien e-mail ;
//  - seule l'EMPREINTE SHA-256 du jeton est stockée en base : une fuite de base
//    ne permet pas de forger un lien de réinitialisation valide ;
//  - TTL court (60 min) + usage unique (le champ est effacé à la consommation).

import { createHash } from "node:crypto";
import { generateToken } from "@/lib/token";

/** Durée de validité d'un lien de réinitialisation (minutes). Court = fenêtre d'exploitation réduite. */
export const RESET_TTL_MINUTES = 60;

/** Empreinte SHA-256 (hex) d'un jeton. Seule l'empreinte est stockée en base. */
export function hashResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Génère un jeton de réinitialisation à usage unique.
 *  - `token`     : secret à 256 bits, transmis UNIQUEMENT dans le lien e-mail ;
 *  - `tokenHash` : empreinte stockée en base (jamais le jeton en clair) ;
 *  - `expiry`    : now + RESET_TTL_MINUTES.
 * `now` injectable (tests).
 */
export function generateResetToken(now: number = Date.now()): {
  token: string;
  tokenHash: string;
  expiry: Date;
} {
  const token = generateToken(32); // 32 octets = 256 bits, URL-safe (base64url)
  return {
    token,
    tokenHash: hashResetToken(token),
    expiry: new Date(now + RESET_TTL_MINUTES * 60 * 1000),
  };
}

/**
 * Un jeton de réinitialisation est-il EXPIRÉ ? `expiry` nul = pas de jeton valide
 * (jamais émis ou déjà consommé) → considéré expiré. `now` injectable (tests).
 */
export function resetTokenExpired(expiry: Date | null, now: number = Date.now()): boolean {
  if (!expiry) return true;
  return expiry.getTime() < now;
}

/** Normalise un e-mail pour une recherche insensible à la casse (aligné sur le login). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Un compte a-t-il le droit de recevoir un lien de réinitialisation ? Même porte
 * que le login (auth.ts) : le compte doit être ACTIF et son organisme non SUSPENDU.
 * Le SUPERADMIN n'a pas d'organisme (`organismeStatut` nul) → éligible.
 */
export function resetEligible(user: {
  isActive: boolean;
  organismeStatut?: string | null;
}): boolean {
  return user.isActive && user.organismeStatut !== "SUSPENDU";
}
