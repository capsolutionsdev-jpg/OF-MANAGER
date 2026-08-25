import { describe, it, expect, vi, afterEach } from "vitest";

// SEC-07 : en VRAIE PRODUCTION sans Upstash configuré, un appelant qui exige un
// rate-limit fiable (failClosed) doit être REFUSÉ plutôt que de retomber sur le
// compteur mémoire par-instance (contournable). Un hoquet transitoire de Redis
// reste, lui, géré en repli — non testé ici (nécessiterait un Redis en erreur).
//
// La détection « vraie prod » passe par VERCEL_ENV : NODE_ENV vaut aussi "production"
// sur les déploiements Preview Vercel, où Upstash n'est pas scopé → ne PAS y enfermer.

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadCheckLimit() {
  vi.resetModules();
  return (await import("@/lib/rate-limit")).checkLimit;
}

describe("checkLimit — fail-closed en vraie prod sans Upstash (SEC-07)", () => {
  it("hors Vercel, prod : refuse (ok:false) si failClosed", async () => {
    vi.stubEnv("VERCEL_ENV", undefined); // self-host → repli sur NODE_ENV
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const checkLimit = await loadCheckLimit();

    const r = await checkLimit("sec07-a", { limit: 1, failClosed: true });

    expect(r.ok).toBe(false);
    expect(r.retryAfter).toBeGreaterThan(0);
  });

  it("hors Vercel, prod : repli mémoire (ok:true) si failClosed non demandé", async () => {
    vi.stubEnv("VERCEL_ENV", undefined);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const checkLimit = await loadCheckLimit();

    const r = await checkLimit("sec07-b", { limit: 5 });

    expect(r.ok).toBe(true);
  });

  it("hors Vercel, dev : failClosed n'enferme pas (repli mémoire)", async () => {
    vi.stubEnv("VERCEL_ENV", undefined);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const checkLimit = await loadCheckLimit();

    const r = await checkLimit("sec07-c", { limit: 5, failClosed: true });

    expect(r.ok).toBe(true);
  });

  it("Preview Vercel (VERCEL_ENV=preview) : failClosed n'enferme PAS malgré NODE_ENV=production", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const checkLimit = await loadCheckLimit();

    const r = await checkLimit("sec07-preview", { limit: 5, failClosed: true });

    expect(r.ok).toBe(true); // ne casse pas l'IA sur les previews de PR
  });

  it("Production Vercel (VERCEL_ENV=production) : failClosed enferme", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const checkLimit = await loadCheckLimit();

    const r = await checkLimit("sec07-prod", { limit: 1, failClosed: true });

    expect(r.ok).toBe(false);
  });
});
