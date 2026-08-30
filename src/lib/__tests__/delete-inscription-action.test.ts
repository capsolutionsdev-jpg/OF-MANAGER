import { describe, it, expect, vi, beforeEach } from "vitest";

// Garde d'intégrité comptable DATA-01 : supprimer une inscription ne doit jamais
// détruire/orpheliner de règlements, factures, conventions ou contrats.

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const fakeDb = {
  inscription: { findFirst: vi.fn(), delete: vi.fn() },
  auditLog: { create: vi.fn() },
};
const requireStaffTenant = vi.fn(async () => ({ db: fakeDb }));
vi.mock("@/lib/tenant", () => ({
  getTenantDb: vi.fn(async () => fakeDb),
  requireStaffTenant: () => requireStaffTenant(),
}));

const auth = vi.fn(async () => ({ user: { id: "u1" } }));
vi.mock("@/auth", () => ({ auth: () => auth() }));

// Imports transitifs lourds du module d'actions — neutralisés pour le test unitaire.
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/actions/parcours-actions", () => ({ startParcours: vi.fn() }));

import { deleteInscriptionAction } from "@/lib/actions/inscription-actions";

function fd(o: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireStaffTenant.mockResolvedValue({ db: fakeDb });
  auth.mockResolvedValue({ user: { id: "u1" } });
});

describe("deleteInscriptionAction — garde d'intégrité comptable (DATA-01)", () => {
  it("refuse la suppression si des règlements existent (rien n'est détruit)", async () => {
    fakeDb.inscription.findFirst.mockResolvedValue({
      id: "i1",
      _count: { paiements: 2, factures: 0, dossiersFinancement: 0 },
      contrat: null,
      convention: null,
    });

    const res = await deleteInscriptionAction(
      fd({ id: "i1", sessionId: "s1", candidatId: "c1" })
    );

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/2 règlements/);
    expect(fakeDb.inscription.delete).not.toHaveBeenCalled();
    expect(fakeDb.auditLog.create).not.toHaveBeenCalled();
  });

  it("refuse si une facture, une convention ou un contrat est lié", async () => {
    fakeDb.inscription.findFirst.mockResolvedValue({
      id: "i1",
      _count: { paiements: 0, factures: 1, dossiersFinancement: 0 },
      contrat: { id: "ct1" },
      convention: { id: "cv1" },
    });

    const res = await deleteInscriptionAction(fd({ id: "i1" }));

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/facture/);
    expect(res.error).toMatch(/convention/);
    expect(res.error).toMatch(/contrat/);
    expect(fakeDb.inscription.delete).not.toHaveBeenCalled();
  });

  it("refuse si un dossier de financement (CPF/OPCO) est lié — sinon orphelin silencieux", async () => {
    fakeDb.inscription.findFirst.mockResolvedValue({
      id: "i1",
      _count: { paiements: 0, factures: 0, dossiersFinancement: 1 },
      contrat: null,
      convention: null,
    });

    const res = await deleteInscriptionAction(fd({ id: "i1" }));

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/dossier de financement/);
    expect(fakeDb.inscription.delete).not.toHaveBeenCalled();
  });

  it("supprime quand aucune donnée comptable n'est liée (+ journalise l'audit)", async () => {
    fakeDb.inscription.findFirst.mockResolvedValue({
      id: "i1",
      _count: { paiements: 0, factures: 0, dossiersFinancement: 0 },
      contrat: null,
      convention: null,
    });
    fakeDb.inscription.delete.mockResolvedValue({ id: "i1" });

    const res = await deleteInscriptionAction(
      fd({ id: "i1", sessionId: "s1", candidatId: "c1" })
    );

    expect(res.ok).toBe(true);
    expect(fakeDb.inscription.delete).toHaveBeenCalledWith({ where: { id: "i1" } });
    expect(fakeDb.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("renvoie une erreur claire (sans 500) si la suppression lève une contrainte", async () => {
    fakeDb.inscription.findFirst.mockResolvedValue({
      id: "i1",
      _count: { paiements: 0, factures: 0, dossiersFinancement: 0 },
      contrat: null,
      convention: null,
    });
    fakeDb.inscription.delete.mockRejectedValue(new Error("FK constraint"));

    const res = await deleteInscriptionAction(fd({ id: "i1" }));

    expect(res.ok).toBe(false);
    expect(fakeDb.auditLog.create).not.toHaveBeenCalled();
  });

  it("renvoie « introuvable » si l'inscription n'est pas dans le tenant (findFirst scopé → null)", async () => {
    fakeDb.inscription.findFirst.mockResolvedValue(null);

    const res = await deleteInscriptionAction(fd({ id: "i1" }));

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/introuvable/);
    expect(fakeDb.inscription.delete).not.toHaveBeenCalled();
  });
});
