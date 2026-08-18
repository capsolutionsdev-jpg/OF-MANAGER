import "server-only";

/**
 * Résilience aux erreurs TRANSITOIRES de base (Neon serverless : cold start,
 * connexion fermée par le serveur, timeout de pool, blip réseau…). En serverless
 * ces erreurs surviennent ponctuellement et, SANS filet, une seule suffit à faire
 * tomber toute une page Server Component en 500 (cause des « plantages » sporadiques
 * de la console : chaque page enchaîne plusieurs requêtes, la moindre qui blip = 500).
 *
 * On ne ré-essaie QUE le manifestement transitoire ; les erreurs applicatives
 * (contrainte, validation, not found…) sont relancées immédiatement — jamais masquées.
 */

// Codes d'erreur Prisma réputés transitoires (connexion / pool / timeout).
const TRANSIENT_CODES = new Set(["P1001", "P1002", "P1008", "P1011", "P1017", "P2024", "P2028", "P2034"]);

// Fragments de messages réseau typiques (Prisma n'expose pas toujours un code).
const TRANSIENT_FRAGMENTS = [
  "can't reach database",
  "connection closed",
  "connection reset",
  "closed the connection",
  "connection terminated",
  "timed out",
  "timeout",
  "econnreset",
  "etimedout",
  "socket hang up",
  "pool timeout",
  "prepared statement",
];

function isTransient(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const code = (e as { code?: string }).code;
  if (typeof code === "string" && TRANSIENT_CODES.has(code)) return true;
  const msg = String((e as { message?: string }).message ?? "").toLowerCase();
  return TRANSIENT_FRAGMENTS.some((f) => msg.includes(f));
}

/**
 * Exécute `fn` en ré-essayant jusqu'à `tries` fois sur erreur transitoire, avec un
 * petit backoff linéaire. Relance toute erreur non transitoire sans attendre.
 */
export async function withDbRetry<T>(fn: () => Promise<T>, tries = 3, baseDelayMs = 120): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (attempt === tries || !isTransient(e)) throw e;
      await new Promise((r) => setTimeout(r, baseDelayMs * attempt));
    }
  }
  throw last;
}

/**
 * Variante TOLÉRANTE pour les sections SECONDAIRES d'une page : ré-essaie le
 * transitoire, puis en dernier recours renvoie `fallback` (au lieu de propager) en
 * journalisant. Ainsi la panne d'une carte annexe ne fait jamais tomber la page.
 */
export async function safeRead<T>(fn: () => Promise<T>, fallback: T, label = "db"): Promise<T> {
  try {
    return await withDbRetry(fn);
  } catch (e) {
    console.error(`[safeRead:${label}] lecture dégradée après ré-essais`, e);
    return fallback;
  }
}
