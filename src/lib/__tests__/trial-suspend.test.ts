import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const findMany = vi.fn();
const update = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organisme: {
      findMany: (a: unknown) => findMany(a),
      update: (a: unknown) => update(a),
    },
  },
}));

const subsList = vi.fn();
const getStripe = vi.fn();
vi.mock("@/lib/stripe", () => ({ getStripe: () => getStripe() }));
vi.mock("@/lib/observability/report-error", () => ({ reportError: vi.fn() }));

import { suspendExpiredTrials } from "@/lib/trial-suspend";

beforeEach(() => {
  vi.clearAllMocks();
  update.mockResolvedValue({});
  getStripe.mockReturnValue({ subscriptions: { list: (a: unknown) => subsList(a) } });
});

describe("suspendExpiredTrials — ne suspend jamais un client payant (A12-005)", () => {
  it("réconcilie en ACTIF un ESSAI expiré ayant un abonnement Stripe actif", async () => {
    findMany.mockResolvedValue([{ id: "o1", stripeCustomerId: "cus_1" }]);
    subsList.mockResolvedValue({ data: [{ status: "active" }] });

    const r = await suspendExpiredTrials();

    expect(r).toEqual({ suspended: 0, reconciled: 1 });
    expect(update).toHaveBeenCalledWith({ where: { id: "o1" }, data: { statut: "ACTIF" } });
  });

  it("suspend un ESSAI expiré sans client Stripe (jamais souscrit)", async () => {
    findMany.mockResolvedValue([{ id: "o2", stripeCustomerId: null }]);

    const r = await suspendExpiredTrials();

    expect(r).toEqual({ suspended: 1, reconciled: 0 });
    expect(update).toHaveBeenCalledWith({ where: { id: "o2" }, data: { statut: "SUSPENDU" } });
    expect(subsList).not.toHaveBeenCalled();
  });

  it("suspend un ESSAI expiré dont l'abonnement Stripe est annulé", async () => {
    findMany.mockResolvedValue([{ id: "o3", stripeCustomerId: "cus_3" }]);
    subsList.mockResolvedValue({ data: [{ status: "canceled" }] });

    const r = await suspendExpiredTrials();

    expect(r).toEqual({ suspended: 1, reconciled: 0 });
    expect(update).toHaveBeenCalledWith({ where: { id: "o3" }, data: { statut: "SUSPENDU" } });
  });

  it("ne suspend PAS en cas d'erreur Stripe (prudence : ne pas couper un client par erreur)", async () => {
    findMany.mockResolvedValue([{ id: "o4", stripeCustomerId: "cus_4" }]);
    subsList.mockRejectedValue(new Error("stripe down"));

    const r = await suspendExpiredTrials();

    expect(r).toEqual({ suspended: 0, reconciled: 0 });
    expect(update).not.toHaveBeenCalled();
  });
});
