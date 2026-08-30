import { describe, it, expect, vi, afterEach } from "vitest";
import type Stripe from "stripe";
import { frTvaTaxRateId } from "@/lib/stripe-tax";

// PC-FACT-06 : l'abonnement est assujetti à la TVA 20 % → un TaxRate exclusif est
// appliqué au checkout, résolu de façon idempotente (jamais de doublon).

function fakeStripe(taxRates: {
  list?: ReturnType<typeof vi.fn>;
  create?: ReturnType<typeof vi.fn>;
}) {
  const s = {
    taxRates: {
      list: taxRates.list ?? vi.fn(async () => ({ data: [] })),
      create: taxRates.create ?? vi.fn(async () => ({ id: "txr_created" })),
    },
  };
  return { stripe: s as unknown as Stripe, tax: s.taxRates };
}

afterEach(() => vi.unstubAllEnvs());

describe("frTvaTaxRateId", () => {
  it("utilise STRIPE_TVA_TAX_RATE_ID si posé (aucun appel Stripe)", async () => {
    vi.stubEnv("STRIPE_TVA_TAX_RATE_ID", "txr_env");
    const { stripe, tax } = fakeStripe({});

    const id = await frTvaTaxRateId(stripe);

    expect(id).toBe("txr_env");
    expect(tax.list).not.toHaveBeenCalled();
    expect(tax.create).not.toHaveBeenCalled();
  });

  it("réutilise le TaxRate marqué existant (pas de doublon)", async () => {
    vi.stubEnv("STRIPE_TVA_TAX_RATE_ID", "");
    const { stripe, tax } = fakeStripe({
      list: vi.fn(async () => ({
        data: [
          { id: "txr_autre", active: true, percentage: 20, metadata: {} },
          {
            id: "txr_found",
            active: true,
            percentage: 20,
            metadata: { ofmanager: "tva-fr-20" },
          },
        ],
      })),
    });

    const id = await frTvaTaxRateId(stripe);

    expect(id).toBe("txr_found");
    expect(tax.create).not.toHaveBeenCalled();
  });

  it("crée le TaxRate FR 20 % (exclusif) si aucun n'existe", async () => {
    vi.stubEnv("STRIPE_TVA_TAX_RATE_ID", "");
    const { stripe, tax } = fakeStripe({
      list: vi.fn(async () => ({ data: [] })),
      create: vi.fn(async () => ({ id: "txr_new" })),
    });

    const id = await frTvaTaxRateId(stripe);

    expect(id).toBe("txr_new");
    const arg = tax.create.mock.calls[0][0];
    expect(arg.percentage).toBe(20);
    expect(arg.inclusive).toBe(false);
    expect(arg.country).toBe("FR");
  });
});
