// Limiteur de débit.
// - Par défaut : compteur EN MÉMOIRE (fenêtre fixe), par-instance — protection
//   de base, se réinitialise au démarrage à froid (serverless).
// - Si UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN sont définis : compteur
//   PARTAGÉ sur Redis (Upstash), robuste à travers toutes les instances.
// L'API publique recommandée est `checkLimit()` (async) ; `rateLimit()` reste
// disponible en synchrone (mémoire) pour les usages simples et les tests.

import { Redis } from "@upstash/redis";

export type LimitResult = { ok: boolean; remaining: number; retryAfter: number };
export type LimitOpts = { limit?: number; windowMs?: number; failClosed?: boolean };

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
let warnedNoRedis = false;
function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  // Correctif audit P1-3 : en PRODUCTION sans Upstash, le rate-limiting tombe sur
  // un compteur mémoire PAR-INSTANCE (réinitialisé aux cold starts, non partagé
  // entre instances) → largement contournable. On alerte bruyamment (Sentry/logs)
  // pour que l'absence de configuration ne passe pas inaperçue.
  if (!redis && !warnedNoRedis && process.env.NODE_ENV === "production") {
    warnedNoRedis = true;
    console.error(
      "[rate-limit] ⚠️ PRODUCTION sans Upstash : rate-limiting en mémoire par-instance " +
        "(contournable). Définir UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN.",
    );
  }
  return redis;
}

/**
 * Limiteur recommandé. Utilise Redis (partagé) si configuré, sinon la mémoire.
 * Fenêtre fixe par INCR + expiration. En cas d'erreur Redis, on n'enferme pas
 * l'utilisateur : repli silencieux sur le compteur mémoire.
 */
export async function checkLimit(key: string, opts: LimitOpts = {}): Promise<LimitResult> {
  const { limit = 5, windowMs = 60_000, failClosed = false } = opts;
  const r = getRedis();
  if (!r) {
    // Pas de backend partagé (Upstash non configuré). En VRAIE PRODUCTION, si l'appelant
    // exige un rate-limit fiable (failClosed), on REFUSE plutôt que de retomber sur un
    // compteur mémoire par-instance contournable (SEC-07). NB : ceci ne mord que sur
    // l'ABSENCE de configuration ; un hoquet transitoire de Redis reste géré en repli
    // (catch ci-dessous) pour ne pas s'auto-infliger un déni de service.
    // Détection de la VRAIE prod via VERCEL_ENV : `NODE_ENV` vaut aussi "production" sur
    // les déploiements Preview Vercel (PR/QA), où Upstash n'est pas scopé — on n'y coupe
    // pas l'IA. Hors Vercel (self-host), VERCEL_ENV est absent → on retombe sur NODE_ENV.
    const isRealProd =
      (process.env.VERCEL_ENV ?? process.env.NODE_ENV) === "production";
    if (failClosed && isRealProd) {
      return { ok: false, remaining: 0, retryAfter: Math.ceil(windowMs / 1000) };
    }
    return rateLimit(key, opts);
  }
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

/**
 * Extrait une IP cliente exploitable depuis les en-têtes de la requête.
 *
 * Correctif audit P1-3 : on privilégie `x-real-ip`, posé par le proxy Vercel =
 * IP réelle du client, NON spoofable par un `x-forwarded-for` forgé côté client.
 * La partie GAUCHE de `x-forwarded-for` est contrôlée par le client (Vercel y
 * APPEND la vraie IP, il ne la remplace pas) → ne jamais s'y fier seule. En repli
 * (dev / autre hébergeur), on prend la DERNIÈRE entrée de XFF (hop de confiance).
 */
export function clientIp(req: Request): string {
  return clientIpFromHeaders(req.headers) ?? "unknown";
}

/**
 * Variante pour les Server Actions (store `headers()` de next/headers).
 * Même priorité que clientIp() : `x-real-ip` (Vercel, non spoofable) d'abord,
 * puis la dernière entrée de `x-forwarded-for`. Renvoie null si rien d'exploitable
 * (usage traçabilité/preuve de signature — audit P1-3).
 */
export function clientIpFromHeaders(hdrs: Headers): string | null {
  const realIp = hdrs.get("x-real-ip");
  if (realIp && realIp.trim()) return realIp.trim();
  const xff = hdrs.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return null;
}
