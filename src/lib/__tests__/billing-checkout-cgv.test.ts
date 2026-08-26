import { describe, it, expect, vi, beforeEach } from "vitest";
import { FORMULE_KEYS, type FormuleKey } from "@/lib/plans";

// Cadre contractuel opposable (décision « contrats validés ») : la souscription
// exige l'acceptation explicite des CGV + DPA/confidentialité, tracée sur l'organisme.

const prisma = vi.hoisted(() => ({
  organisme: { findUnique: vi.fn(), update: vi.fn() },
  auditLog: { create: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

const auth = vi.fn(async () => ({
  user: { id: "u1", role: "ADMIN", organismeId: "org1", email: "a@b.c" },
}));
vi.mock("@/auth", () => ({ auth: () => auth() }));

const checkoutCreate = vi.fn(async () => ({ url: "https://stripe.test/checkout" }));
const fakeStripe = { checkout: { sessions: { create: checkoutCreate } }, customers: { create: vi.fn() } };
const getStripe = vi.fn(() => fakeStripe);
vi.mock("@/lib/stripe", () => ({ getStripe: () => getStripe(), isStripeConfigured: () => true }));

const KEY = [...FORMULE_KEYS][0] as FormuleKey;
vi.mock("@/lib/pricing", () => ({
  getResolvedPlans: vi.fn(async () => ({
    plans: { [KEY]: { name: "Pro", price: 189, priceYear: null } },
  })),
}));
vi.mock("@/lib/stripe-tax", () => ({ frTvaTaxRateId: vi.fn(async () => "txr_test") }));
vi.mock("@/lib/token", () => ({ appBaseUrl: () => "https://ofmanager.info" }));

import { createCheckout } from "@/lib/actions/billing-actions";

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "ADMIN", organismeId: "org1", email: "a@b.c" } });
  prisma.organisme.findUnique.mockResolvedValue({
    id: "org1",
    isDemo: false,
    stripeCustomerId: "cus_1",
    raisonSociale: "OF Test",
    nom: "OF Test",
    email: "of@test.fr",
  });
});

describe("createCheckout — garde d'acceptation contractuelle", () => {
  it("refuse la souscription si les CGV ne sont pas acceptées (aucun appel Stripe ni écriture)", async () => {
    const res = await createCheckout(KEY, "mensuel", false);

    expect(res.error).toMatch(/accepter les CGV/i);
    expect(res.url).toBeUndefined();
    expect(getStripe).not.toHaveBeenCalled();
    expect(prisma.organisme.findUnique).not.toHaveBeenCalled();
    expect(prisma.organisme.update).not.toHaveBeenCalled();
  });

  it("par défaut (3ᵉ argument omis) la souscription est refusée", async () => {
    const res = await createCheckout(KEY, "mensuel");
    expect(res.error).toMatch(/accepter les CGV/i);
    expect(prisma.organisme.update).not.toHaveBeenCalled();
  });

  it("accepté : trace cgv + confidentialité (horodatage + audit nominatif) et ouvre le checkout", async () => {
    const res = await createCheckout(KEY, "mensuel", true);

    expect(res.url).toBe("https://stripe.test/checkout");
    expect(prisma.organisme.update).toHaveBeenCalledTimes(1);
    const arg = prisma.organisme.update.mock.calls[0][0];
    expect(arg.where).toEqual({ id: "org1" });
    expect(arg.data.cgvAcceptedAt).toBeInstanceOf(Date);
    expect(arg.data.confidentialiteAcceptedAt).toBeInstanceOf(Date);
    // Opposabilité : le « qui » est journalisé (userId de la session).
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    const audit = prisma.auditLog.create.mock.calls[0][0];
    expect(audit.data.action).toBe("ACCEPT_CGV");
    expect(audit.data.userId).toBe("u1");
    expect(audit.data.organismeId).toBe("org1");
    expect(checkoutCreate).toHaveBeenCalledTimes(1);
  });

  it("compte de démonstration : bloqué même si accepté, sans tracer d'acceptation", async () => {
    prisma.organisme.findUnique.mockResolvedValue({ id: "org1", isDemo: true });

    const res = await createCheckout(KEY, "mensuel", true);

    expect(res.error).toMatch(/démonstration/i);
    expect(prisma.organisme.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(checkoutCreate).not.toHaveBeenCalled();
  });

  it("période annuelle indisponible (priceYear null) : refus AVANT tout traçage — pas d'acceptation fantôme", async () => {
    // Le plan mocké a priceYear:null → la validation période doit précéder l'écriture.
    const res = await createCheckout(KEY, "annuel", true);

    expect(res.error).toMatch(/annuelle indisponible/i);
    expect(prisma.organisme.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(checkoutCreate).not.toHaveBeenCalled();
  });
});
