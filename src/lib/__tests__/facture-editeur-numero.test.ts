import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

// BACK-01 : l'émission d'une facture éditeur doit numéroter de façon ATOMIQUE
// (compteur nextRef), jamais via count()+1 (doublons en concurrence).

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/superadmin-guard", () => ({ requireSuperAdmin: vi.fn(async () => {}) }));

// `vi.hoisted` : les mocks sont remontés en tête de fichier, donc les objets
// qu'ils référencent doivent l'être aussi (sinon « Cannot access before initialization »).
const { prisma, nextRef, getEmetteur } = vi.hoisted(() => ({
  prisma: {
    factureEditeur: {
      findUnique: vi.fn(),
      findMany: vi.fn(async () => []),
      updateMany: vi.fn(),
    },
  },
  nextRef: vi.fn(async () => "F-2026-0001"),
  getEmetteur: vi.fn(
    async (): Promise<{ nom: string; siret: string | null; tva: string | null }> => ({
      nom: "CAP SOLUTIONS",
      siret: "83912345600018",
      tva: "FR12839123456",
    }),
  ),
}));
vi.mock("@/lib/numerotation", () => ({ nextRef, maxSuffix: () => 0 }));
vi.mock("@/lib/prisma", () => ({ prisma }));

// Neutralise les imports lourds ; getEmetteur (source réelle de la facture) est piloté par les tests.
vi.mock("@/lib/factures/editeur-render", () => ({ renderFacturx: vi.fn() }));
vi.mock("@/lib/factures/editeur-data", () => ({
  getEmetteur,
  partieFromOrg: vi.fn(),
  factureDataFrom: vi.fn(),
}));
vi.mock("@/lib/factures/pdp", () => ({ getPdpAdapter: () => ({ configured: false }) }));

import { emettreFactureEditeur } from "@/lib/actions/facture-editeur-actions";

function p2002() {
  return new Prisma.PrismaClientKnownRequestError("dup", {
    code: "P2002",
    clientVersion: "x",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  nextRef.mockResolvedValue("F-2026-0001");
  getEmetteur.mockResolvedValue({
    nom: "CAP SOLUTIONS",
    siret: "83912345600018",
    tva: "FR12839123456",
  });
});

describe("emettreFactureEditeur — numérotation atomique (BACK-01)", () => {
  it("refuse l'émission si l'émetteur (SIRET/TVA) est incomplet (PC-JUR-02)", async () => {
    getEmetteur.mockResolvedValue({ nom: "OF Manager", siret: null, tva: null });
    prisma.factureEditeur.findUnique.mockResolvedValue({ organismeId: "o1", numero: null });

    const r = await emettreFactureEditeur("f1");

    expect(r.error).toMatch(/émetteur/i);
    expect(nextRef).not.toHaveBeenCalled();
    expect(prisma.factureEditeur.updateMany).not.toHaveBeenCalled();
  });
  it("émet via nextRef (jamais count global) + garde de concurrence numero:null", async () => {
    prisma.factureEditeur.findUnique.mockResolvedValue({ organismeId: "o1", numero: null });
    prisma.factureEditeur.updateMany.mockResolvedValue({ count: 1 });

    const r = await emettreFactureEditeur("f1");

    expect(r.ok).toBe(true);
    expect(nextRef).toHaveBeenCalledTimes(1);
    const call = prisma.factureEditeur.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: "f1", numero: null });
    expect(call.data.numero).toBe("F-2026-0001");
  });

  it("refuse si la facture est déjà émise (numero non nul)", async () => {
    prisma.factureEditeur.findUnique.mockResolvedValue({ organismeId: "o1", numero: "F-2026-0009" });

    const r = await emettreFactureEditeur("f1");

    expect(r.error).toMatch(/déjà émise/);
    expect(nextRef).not.toHaveBeenCalled();
    expect(prisma.factureEditeur.updateMany).not.toHaveBeenCalled();
  });

  it("concurrence : updateMany count=0 → « déjà émise », aucun doublon", async () => {
    prisma.factureEditeur.findUnique.mockResolvedValue({ organismeId: "o1", numero: null });
    prisma.factureEditeur.updateMany.mockResolvedValue({ count: 0 });

    const r = await emettreFactureEditeur("f1");

    expect(r.error).toMatch(/déjà émise/);
  });

  it("collision P2002 sur le numéro → régénère et réessaie", async () => {
    prisma.factureEditeur.findUnique.mockResolvedValue({ organismeId: "o1", numero: null });
    nextRef.mockResolvedValueOnce("F-2026-0001").mockResolvedValueOnce("F-2026-0002");
    prisma.factureEditeur.updateMany
      .mockRejectedValueOnce(p2002())
      .mockResolvedValueOnce({ count: 1 });

    const r = await emettreFactureEditeur("f1");

    expect(r.ok).toBe(true);
    expect(nextRef).toHaveBeenCalledTimes(2);
    expect(prisma.factureEditeur.updateMany).toHaveBeenCalledTimes(2);
  });

  it("facture introuvable → erreur", async () => {
    prisma.factureEditeur.findUnique.mockResolvedValue(null);

    const r = await emettreFactureEditeur("f1");

    expect(r.error).toMatch(/introuvable/);
  });
});
