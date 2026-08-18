import { describe, it, expect, afterEach } from "vitest";
import { getPdpAdapter, buildEreportingPayload } from "@/lib/factures/pdp";

describe("PDP — sélection d'adaptateur (agnostique du prestataire)", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env.PDP_PROVIDER = saved.PDP_PROVIDER;
    process.env.PDP_API_URL = saved.PDP_API_URL;
    process.env.PDP_API_KEY = saved.PDP_API_KEY;
  });

  it("aucune config → Noop non configuré ; transmit dégrade sans jeter", async () => {
    delete process.env.PDP_PROVIDER;
    delete process.env.PDP_API_URL;
    delete process.env.PDP_API_KEY;
    const a = getPdpAdapter();
    expect(a.configured).toBe(false);
    const r = await a.transmit({ numero: "F-1", clientSiren: null, montantTTC: 100, facturx: new Uint8Array() });
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it("provider défini mais clés manquantes → reste Noop", () => {
    process.env.PDP_PROVIDER = "iopole";
    delete process.env.PDP_API_URL;
    delete process.env.PDP_API_KEY;
    expect(getPdpAdapter().configured).toBe(false);
  });

  it("provider + url + clé → adaptateur configuré, nommé", () => {
    process.env.PDP_PROVIDER = "iopole";
    process.env.PDP_API_URL = "https://api.exemple.test/invoices";
    process.env.PDP_API_KEY = "cle";
    const a = getPdpAdapter();
    expect(a.configured).toBe(true);
    expect(a.name).toBe("iopole");
  });
});

describe("e-reporting — charge d'encaissement", () => {
  it("construit la charge depuis la facture", () => {
    const p = buildEreportingPayload({
      numero: "F-2026-0001",
      montantTTC: 178.8,
      paidAt: new Date("2026-09-01T00:00:00.000Z"),
    });
    expect(p).toEqual({
      type: "ENCAISSEMENT",
      numero: "F-2026-0001",
      montantTTC: 178.8,
      devise: "EUR",
      dateEncaissement: "2026-09-01T00:00:00.000Z",
    });
  });

  it("paidAt null → dateEncaissement null", () => {
    expect(buildEreportingPayload({ numero: "F-1", montantTTC: 10, paidAt: null }).dateEncaissement).toBeNull();
  });
});
