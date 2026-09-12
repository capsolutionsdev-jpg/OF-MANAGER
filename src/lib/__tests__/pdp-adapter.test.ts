import { describe, it, expect, vi, afterEach } from "vitest";
import { getPdpAdapter } from "@/lib/factures/pdp";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("PDP — adaptateur de transmission (A12-002/007)", () => {
  it("Noop par défaut (aucune PDP configurée) : dégrade sans erreur silencieuse", async () => {
    vi.stubEnv("PDP_PROVIDER", "");
    const adapter = getPdpAdapter();
    expect(adapter.configured).toBe(false);
    const r = await adapter.transmit({
      numero: "F-1",
      clientSiren: null,
      montantTTC: 100,
      facturx: new Uint8Array([1]),
    });
    expect(r.ok).toBe(false);
  });

  it("REST : envoie Idempotency-Key + un signal de timeout et renvoie la référence", async () => {
    vi.stubEnv("PDP_PROVIDER", "test");
    vi.stubEnv("PDP_API_URL", "https://pdp.test/deposit");
    vi.stubEnv("PDP_API_KEY", "k");
    const spy = vi.fn(async (_u: unknown, init: RequestInit = {}) => {
      expect(init.signal).toBeInstanceOf(AbortSignal); // A12-002 : timeout
      expect(new Headers(init.headers).get("Idempotency-Key")).toBe("fac-1"); // A12-007
      return new Response(JSON.stringify({ reference: "PDP-XYZ" }), { status: 200 });
    });
    vi.stubGlobal("fetch", spy);
    const r = await getPdpAdapter().transmit({
      numero: "F-1",
      clientSiren: "123456789",
      montantTTC: 100,
      facturx: new Uint8Array([1]),
      idempotencyKey: "fac-1",
    });
    expect(r).toEqual({ ok: true, reference: "PDP-XYZ" });
  });
});
