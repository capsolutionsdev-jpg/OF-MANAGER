// Refus des e-mails jetables sur le formulaire de démo (anti-abus). Liste courte
// des domaines jetables les plus courants — suffisant pour filtrer le gros du bruit
// sans dépendance externe.
const DISPOSABLE_DOMAINS = new Set([
  "yopmail.com", "yopmail.fr", "mailinator.com", "guerrillamail.com", "guerrillamail.info",
  "sharklasers.com", "grr.la", "temp-mail.org", "tempmail.com", "10minutemail.com",
  "trashmail.com", "throwawaymail.com", "getnada.com", "maildrop.cc", "dispostable.com",
  "fakeinbox.com", "mailnesia.com", "tempinbox.com", "spam4.me", "mytemp.email",
  "jetable.org", "moakt.com", "emailondeck.com", "mohmal.com", "tmail.io", "burnermail.io",
]);

/** Vrai si l'e-mail semble jetable (domaine dans la liste). Insensible à la casse. */
export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return DISPOSABLE_DOMAINS.has(domain);
}

/** Validation e-mail basique (format). */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
