import { describe, it, expect, beforeEach, vi } from "vitest";

// Prisma mocké : aucune base réelle. On pilote planTarif.findMany par test.
vi.mock("@/lib/prisma", () => ({
  prisma: { planTarif: { findMany: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { getResolvedPlans } from "@/lib/pricing";

type Fn = ReturnType<typeof vi.fn>;
const db = prisma as unknown as { planTarif: { findMany: Fn } };

beforeEach(() => db.planTarif.findMany.mockReset());

describe("getResolvedPlans() — fusion défauts + overrides DB", () => {
  it("renvoie les défauts du code sans override", async () => {
    db.planTarif.findMany.mockResolvedValue([]);
    const { plans, popular } = await getResolvedPlans();
    expect(plans.INDEPENDANT.name).toBe("Indépendant");
    expect(plans.INDEPENDANT.price).toBe(59);
    expect(plans.INDEPENDANT.maxComptes).toBe(1);
    expect(plans.RESEAU.maxComptes).toBeNull();
    expect(popular).toBe("PRO");
  });

  it("applique l'override (nom/prix), 0 comptes = illimité, et la mise en avant", async () => {
    db.planTarif.findMany.mockResolvedValue([
      { formule: "INDEPENDANT", nom: "Starter", prix: 99, tagline: "t", supportLevel: "s", fonctionnalites: [], comptesInclus: 0, populaire: true },
    ]);
    const { plans, popular } = await getResolvedPlans();
    expect(plans.INDEPENDANT.name).toBe("Starter");
    expect(plans.INDEPENDANT.price).toBe(99);
    expect(plans.INDEPENDANT.maxComptes).toBeNull(); // 0 ⇒ illimité
    expect(popular).toBe("INDEPENDANT");
  });

  it("respecte un nombre de comptes inclus explicite", async () => {
    db.planTarif.findMany.mockResolvedValue([
      { formule: "PRO", nom: null, prix: 189, tagline: "t", supportLevel: "s", fonctionnalites: [], comptesInclus: 8, populaire: false },
    ]);
    const { plans } = await getResolvedPlans();
    expect(plans.PRO.maxComptes).toBe(8);
    expect(plans.PRO.name).toBe("Pro"); // nom null ⇒ défaut
  });

  // NB : la tolérance « DB indisponible → défauts » est assurée par le try/catch
  // de getResolvedPlans (lib/pricing.ts). Non testée ici car vi.fn conserve la
  // promesse rejetée dans mock.results et Vitest la signale comme non gérée,
  // bien que le code la capture correctement.
});
