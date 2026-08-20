/** Durée de validité d'un lien d'invitation entreprise (jours). */
export const INVITE_TTL_DAYS = 7;

/**
 * Un jeton d'invitation est-il EXPIRÉ ? `expiry` nul = pas de jeton valide
 * (jamais émis ou déjà consommé) → considéré expiré. `now` injectable (tests).
 */
export function inviteTokenExpired(expiry: Date | null, now: number = Date.now()): boolean {
  if (!expiry) return true;
  return expiry.getTime() < now;
}
