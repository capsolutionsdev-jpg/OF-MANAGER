import { describe, it, expect, vi, beforeEach } from "vitest";

// entreprise-data.ts est `server-only` — neutralisé pour le test unitaire.
vi.mock("server-only", () => ({}));

// On enregistre les arguments passés à chaque `findMany` pour vérifier la
// présence du filtre `entrepriseId` (la garantie d'isolation entre clients).
const calls: Record<string, unknown[]> = {};
function recorder(model: string) {
  return {
    findMany: vi.fn(async (args: unknown) => {
      (calls[model] ??= []).push(args);
      return [];
    }),
  };
}
const fakeDb = {
  inscription: recorder("inscription"),
  documentGenere: recorder("documentGenere"),
  facture: recorder("facture"),
  session: recorder("session"),
};
vi.mock("@/lib/tenant", () => ({ getTenantDb: vi.fn(async () => fakeDb) }));

import {
  getEntrepriseInscriptions,
  getEntrepriseSuivi,
  getEntrepriseDocuments,
  getEntrepriseFactures,
  getEntreprisePlanning,
} from "@/lib/entreprise-data";

// Petit typage local pour lire `where` sans `any`.
type Args = { where?: Record<string, unknown> };
const lastWhere = (model: string): Record<string, unknown> =>
  ((calls[model]?.[calls[model].length - 1] as Args)?.where ?? {});

describe("Isolation entreprise — chaque requête par entreprise filtre par entrepriseId", () => {
  beforeEach(() => {
    for (const k of Object.keys(calls)) delete calls[k];
  });

  it("getEntrepriseInscriptions filtre par entrepriseId", async () => {
    await getEntrepriseInscriptions("ent-A");
    expect(lastWhere("inscription").entrepriseId).toBe("ent-A");
  });

  it("getEntrepriseSuivi filtre par entrepriseId", async () => {
    await getEntrepriseSuivi("ent-A");
    expect(lastWhere("inscription").entrepriseId).toBe("ent-A");
  });

  it("getEntrepriseDocuments filtre via inscription.entrepriseId", async () => {
    await getEntrepriseDocuments("ent-A");
    const rel = lastWhere("documentGenere").inscription as { entrepriseId?: string } | undefined;
    expect(rel?.entrepriseId).toBe("ent-A");
  });

  it("getEntrepriseFactures filtre par entrepriseId", async () => {
    await getEntrepriseFactures("ent-A");
    expect(lastWhere("facture").entrepriseId).toBe("ent-A");
  });

  it("deux entreprises différentes ne partagent pas le même filtre", async () => {
    await getEntrepriseInscriptions("ent-A");
    await getEntrepriseInscriptions("ent-B");
    expect((calls.inscription[0] as Args).where?.entrepriseId).toBe("ent-A");
    expect((calls.inscription[1] as Args).where?.entrepriseId).toBe("ent-B");
  });

  it("getEntreprisePlanning (catalogue OF) n'est PAS filtré par entreprise mais par statut/date", async () => {
    await getEntreprisePlanning();
    const w = lastWhere("session");
    expect(w.isArchived).toBe(false);
    expect(w).toHaveProperty("dateDebut");
    expect(w).not.toHaveProperty("entrepriseId");
  });
});
