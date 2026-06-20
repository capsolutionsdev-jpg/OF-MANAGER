// Limiteur de débit.
// - Par défaut : compteur EN MÉMOIRE (fenêtre fixe), par-instance — protection
//   de base, se réinitialise au démarrage à froid (serverless).
// - Si UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN sont définis : compteur
//   PARTAGÉ sur Redis (Upstash), robuste à travers toutes les instances.
// L'API publique recommandée est `checkLimit()` (async) ; `rateLimit()` reste
// disponible en synchrone (mémoire) pour les usages simples et les tests.

import { Redis } from "@upstash/redis";

export type LimitResult = { ok: boolean; remaining: number; retryAfter: number };
export type LimitOpts = { limit?: number; windowMs?: number };

type Bucket = { count: number; reset: number };
const store = new Map<string, Bucket>();

/** Limiteur synchrone en mémoire (fenêtre fixe). Repli par défaut. */
export function rateLimit(
  key: string,
  { limit = 5, windowMs = 60_000 }: LimitOpts = {},
): LimitResult {
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

// Client Redis paresseux : null si non configuré (→ repli mémoire).
let redis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

/**
 * Limiteur recommandé. Utilise Redis (partagé) si configuré, sinon la mémoire.
 * Fenêtre fixe par INCR + expiration. En cas d'erreur Redis, on n'enferme pas
 * l'utilisateur : repli silencieux sur le compteur mémoire.
 */
export async function checkLimit(key: string, opts: LimitOpts = {}): Promise<LimitResult> {
  const { limit = 5, windowMs = 60_000 } = opts;
  const r = getRedis();
  if (!r) return rateLimit(key, opts);
  try {
    const k = `rl:${key}`;
    const count = await r.incr(k);
    if (count === 1) await r.pexpire(k, windowMs);
    if (count > limit) {
      const ttl = await r.pttl(k);
      return { ok: false, remaining: 0, retryAfter: Math.ceil((ttl > 0 ? ttl : windowMs) / 1000) };
    }
    return { ok: true, remaining: limit - count, retryAfter: 0 };
  } catch (e) {
    console.error("[rate-limit] Redis indisponible, repli mémoire:", e);
    return rateLimit(key, opts);
  }
}

/** Extrait une IP cliente exploitable depuis les en-têtes de la requête. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
