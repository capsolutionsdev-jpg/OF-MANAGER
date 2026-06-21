import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organisme: { findUnique: vi.fn() },
    user: { count: vi.fn() },
    planTarif: { findMany: vi.fn() }, // utilisé par getResolvedPlans (comptes inclus)
  },
}));

import { prisma } from "@/lib/prisma";
import { getSeatInfo } from "@/lib/seats";

type Fn = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  organisme: { findUnique: Fn };
  user: { count: Fn };
  planTarif: { findMany: Fn };
};

beforeEach(() => {
  db.organisme.findUnique.mockReset();
  db.user.count.mockReset();
  db.planTarif.findMany.mockReset().mockResolvedValue([]); // défauts (3/5/illimité)
});

describe("getSeatInfo() — limites de sièges back-office", () => {
  it("Basique 2/3 → peut ajouter", async () => {
    db.organisme.findUnique.mockResolvedValue({ formule: "BASIQUE", fonctionnalites: [], maxUtilisateurs: null });
    db.user.count.mockResolvedValue(2);
    const s = await getSeatInfo("o1");
    expect(s.included).toBe(3);
    expect(s.limit).toBe(3);
    expect(s.used).toBe(2);
    expect(s.canAdd).toBe(true);
  });

  it("Basique 3/3 → bloqué", async () => {
    db.organisme.findUnique.mockResolvedValue({ formule: "BASIQUE", fonctionnalites: [], maxUtilisateurs: null });
    db.user.count.mockResolvedValue(3);
    expect((await getSeatInfo("o1")).canAdd).toBe(false);
  });

  it("override maxUtilisateurs prioritaire sur la formule (sièges payants)", async () => {
    db.organisme.findUnique.mockResolvedValue({ formule: "BASIQUE", fonctionnalites: [], maxUtilisateurs: 5 });
    db.user.count.mockResolvedValue(3);
    const s = await getSeatInfo("o1");
    expect(s.limit).toBe(5);
    expect(s.canAdd).toBe(true);
  });

  it("Complet = illimité (limite nulle, toujours canAdd)", async () => {
    db.organisme.findUnique.mockResolvedValue({ formule: "COMPLET", fonctionnalites: [], maxUtilisateurs: null });
    db.user.count.mockResolvedValue(50);
    const s = await getSeatInfo("o1");
    expect(s.limit).toBeNull();
    expect(s.canAdd).toBe(true);
  });

  it("ne compte QUE les rôles back-office (filtre la requête de comptage)", async () => {
    db.organisme.findUnique.mockResolvedValue({ formule: "MEDIUM", fonctionnalites: [], maxUtilisateurs: null });
    db.user.count.mockResolvedValue(1);
    await getSeatInfo("o1");
    const where = db.user.count.mock.calls[0][0].where;
    expect(where.organismeId).toBe("o1");
    expect(where.role.in).toEqual(["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"]);
  });
});
