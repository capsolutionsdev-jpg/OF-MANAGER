import { describe, it, expect, vi, beforeEach } from "vitest";

// P1 (PC-INFRA-11/12) : chaque cron doit être protégé (CRON_SECRET), exécuté dans
// un try/catch, et toute erreur REPORTÉE (Sentry/logs) — Vercel Cron ne réessaie pas.

const assertCronAuthorized = vi.fn();
vi.mock("@/lib/cron-auth", () => ({
  assertCronAuthorized: (r: Request) => assertCronAuthorized(r),
}));

const reportError = vi.fn(async () => {});
vi.mock("@/lib/observability/report-error", () => ({
  reportError: (...a: unknown[]) =>
    (reportError as (...x: unknown[]) => unknown)(...a),
}));

import { runCron } from "@/lib/cron-runner";

const req = new Request("https://x.test/api/cron/x");

beforeEach(() => {
  vi.clearAllMocks();
  assertCronAuthorized.mockReturnValue(undefined); // autorisé par défaut
});

describe("runCron — filet standard des crons", () => {
  it("non autorisé : renvoie la réponse « denied » et n'exécute PAS la tâche", async () => {
    const denied = new Response("no", { status: 401 });
    assertCronAuthorized.mockReturnValue(denied);
    const fn = vi.fn();

    const res = await runCron(req, "x", fn);

    expect(res).toBe(denied);
    expect(fn).not.toHaveBeenCalled();
    expect(reportError).not.toHaveBeenCalled();
  });

  it("succès : { ok:true, ranAt, ...data }", async () => {
    const res = await runCron(req, "purge", async () => ({ purged: 3 }));

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.purged).toBe(3);
    expect(json.ranAt).toBeTruthy();
    expect(reportError).not.toHaveBeenCalled();
  });

  it("échec : reporte l'erreur (tag cron:<tag>) et renvoie 500 { ok:false }", async () => {
    const boom = new Error("boom");
    const res = await runCron(req, "x", async () => {
      throw boom;
    });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(reportError).toHaveBeenCalledWith(boom, { tag: "cron:x" });
  });

  it("tâche sans valeur de retour → { ok:true } quand même", async () => {
    const res = await runCron(req, "x", async () => {});
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
