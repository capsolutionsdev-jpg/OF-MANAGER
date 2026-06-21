import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organisme: { findMany: vi.fn() },
    candidat: { findMany: vi.fn(), updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { purgeExpiredCandidats } from "@/lib/rgpd-retention";

type Fn = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  organisme: { findMany: Fn };
  candidat: { findMany: Fn; updateMany: Fn };
  auditLog: { create: Fn };
};

beforeEach(() => {
  db.organisme.findMany.mockReset();
  db.candidat.findMany.mockReset();
  db.candidat.updateMany.mockReset().mockResolvedValue({ count: 1 });
  db.auditLog.create.mockReset().mockResolvedValue({});
});

describe("purgeExpiredCandidats() — purge RGPD par durée de conservation", () => {
  it("anonymise chaque candidat expiré + journalise", async () => {
    db.organisme.findMany.mockResolvedValue([{ id: "o1", dureeConservationMois: 36 }]);
    db.candidat.findMany.mockResolvedValue([{ id: "c1" }, { id: "c2" }]);

    const res = await purgeExpiredCandidats();

    expect(res.organismes).toBe(1);
    expect(res.anonymises).toBe(2);
    expect(db.candidat.updateMany).toHaveBeenCalledTimes(2);
    expect(db.auditLog.create).toHaveBeenCalledTimes(2);

    // Filtre de sélection : tenant + non déjà anonymisé + inactif au-delà du butoir
    const where = db.candidat.findMany.mock.calls[0][0].where;
    expect(where.organismeId).toBe("o1");
    expect(where.anonymiseLe).toBeNull();
    expect(where.updatedAt.lt).toBeInstanceOf(Date);

    // L'anonymisation efface bien les données identifiantes + marque anonymiseLe
    const data = db.candidat.updateMany.mock.calls[0][0].data;
    expect(data.nom).toBe("Anonymisé");
    expect(data.email).toContain("@rgpd.local");
    expect(data.anonymiseLe).toBeInstanceOf(Date);
  });

  it("ne touche à rien s'il n'y a aucun candidat expiré", async () => {
    db.organisme.findMany.mockResolvedValue([{ id: "o1", dureeConservationMois: 36 }]);
    db.candidat.findMany.mockResolvedValue([]);
    const res = await purgeExpiredCandidats();
    expect(res.anonymises).toBe(0);
    expect(db.candidat.updateMany).not.toHaveBeenCalled();
  });

  it("applique la durée propre à chaque organisme", async () => {
    db.organisme.findMany.mockResolvedValue([{ id: "o1", dureeConservationMois: 12 }]);
    db.candidat.findMany.mockResolvedValue([]);
    const before = new Date();
    before.setMonth(before.getMonth() - 12);
    await purgeExpiredCandidats();
    const cutoff = db.candidat.findMany.mock.calls[0][0].where.updatedAt.lt as Date;
    // butoir ≈ maintenant - 12 mois (tolérance large)
    expect(Math.abs(cutoff.getTime() - before.getTime())).toBeLessThan(60_000);
  });
});
