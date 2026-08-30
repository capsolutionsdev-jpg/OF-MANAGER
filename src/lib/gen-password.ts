// Génère un mot de passe provisoire aléatoire via Web Crypto (CSPRNG).
// Audit SEC-054 / F-11 : remplace `Math.random()` (non cryptographique, prédictible)
// pour toute valeur servant d'identifiant/credential. Compatible SSR (Node ≥18 :
// `globalThis.crypto`) et navigateur.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sans I/O/0/1/l (ambigus)

export function genProvisionalPassword(prefix = "CAP", length = 6): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${prefix}-${body}`;
}
