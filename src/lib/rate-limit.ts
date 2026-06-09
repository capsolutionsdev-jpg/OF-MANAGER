// Limiteur de débit léger en mémoire (fenêtre fixe).
// Note : en serverless, le compteur est par-instance et se réinitialise au
// démarrage à froid. C'est une protection de base contre le flood ; pour une
// limite partagée robuste, brancher Upstash Ratelimit (Redis).

type Bucket = { count: number; reset: number };
const store = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  { limit = 5, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {},
): { ok: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const b = store.get(key);
  if (!b || now > b.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((b.reset - now) / 1000) };
  }
  b.count++;
  return { ok: true, remaining: limit - b.count, retryAfter: 0 };
}

/** Extrait une IP cliente exploitable depuis les en-têtes de la requête. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
