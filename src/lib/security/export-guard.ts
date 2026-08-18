import { rateLimit } from "@/lib/rate-limit";

/**
 * Plafond anti-exfiltration mutualisé pour la famille des routes d'export
 * (CSV/Excel/JSON/FEC…). Tous les exports d'un même utilisateur partagent un
 * seul compteur : un usage normal (quelques exports) passe, mais le scraping en
 * boucle d'une session volée ou d'un script est bridé. cf. §79.
 *
 * Renvoie une `Response` 429 à retourner tel quel si la limite est franchie,
 * sinon `null` (l'appelant poursuit). À placer APRÈS le contrôle de rôle, une
 * fois `session.user.id` connu.
 */
export function exportRateLimited(userId: string): Response | null {
  const rl = rateLimit(`export:${userId}`, { limit: 60, windowMs: 60_000 });
  if (rl.ok) return null;
  return new Response("Trop de requêtes d'export. Réessayez dans une minute.", {
    status: 429,
    headers: { "Retry-After": String(rl.retryAfter) },
  });
}
