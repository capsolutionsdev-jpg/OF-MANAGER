import { describe, it, expect } from "vitest";
import { softWhere, SOFT_DELETE_MODELS } from "@/lib/tenant-scope";

describe("softWhere — cloisonnement + corbeille (audit A09-003)", () => {
  it("ajoute organismeId sur un where vide/absent", () => {
    expect(softWhere(undefined, "org1", false)).toEqual({ organismeId: "org1" });
    expect(softWhere({}, "org1", false)).toEqual({ organismeId: "org1" });
  });

  it("le organismeId du tenant écrase toute tentative venue du payload (isolation)", () => {
    const w = softWhere({ organismeId: "AUTRE_OF", nom: "x" }, "org1", false);
    expect(w.organismeId).toBe("org1");
    expect(w.nom).toBe("x");
  });

  it("exclut la corbeille quand soft=true", () => {
    expect(softWhere({ nom: "x" }, "org1", true)).toEqual({
      nom: "x",
      organismeId: "org1",
      deletedAt: null,
    });
    expect(softWhere(undefined, "org1", true)).toEqual({ organismeId: "org1", deletedAt: null });
  });

  it("n'ajoute PAS deletedAt quand soft=false (modèle hors corbeille ou mode includeDeleted)", () => {
    expect("deletedAt" in softWhere({}, "org1", false)).toBe(false);
  });

  it("déclare exactement les 5 modèles à corbeille", () => {
    for (const m of ["Candidat", "Session", "Inscription", "Entreprise", "Facture"]) {
      expect(SOFT_DELETE_MODELS.has(m)).toBe(true);
    }
    // Les modèles globaux / hors périmètre ne sont pas soft-deletables.
    expect(SOFT_DELETE_MODELS.has("Organisme")).toBe(false);
    expect(SOFT_DELETE_MODELS.has("User")).toBe(false);
    expect(SOFT_DELETE_MODELS.size).toBe(5);
  });
});
