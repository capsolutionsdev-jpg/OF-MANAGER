import { describe, it, expect } from "vitest";
import { toPublicSessionDTO } from "@/lib/public-dto";

// Contrat de l'API publique (/api/public/sessions), consommée par la vitrine ET
// l'app mobile Capacitor. Ce test VERROUILLE la forme du DTO : retirer/renommer un
// champ casse la CI (au lieu de casser silencieusement les clients) — A12-014.
describe("Contrat DTO session publique (A12-014)", () => {
  const dto = toPublicSessionDTO({
    id: "s1",
    dateDebut: new Date("2026-03-01T09:00:00.000Z"),
    dateFin: new Date("2026-03-02T17:00:00.000Z"),
    horaires: "9h-17h",
    lieu: "Paris",
    modalite: "PRESENTIEL",
    statut: "OUVERTE",
    nbPlaces: 10,
    formation: { titre: "SSIAP 1", academy: "SAFETY", reference: "ssiap-1" },
    inscriptions: [{ id: "i1" }, { id: "i2" }],
  });

  it("expose exactement les champs du contrat", () => {
    expect(Object.keys(dto).sort()).toEqual(
      [
        "academy",
        "dateDebut",
        "dateFin",
        "formation",
        "horaires",
        "id",
        "lieu",
        "modalite",
        "placesRestantes",
        "placesTotal",
        "reference",
        "statut",
      ].sort(),
    );
  });

  it("calcule les places restantes (jamais négatif) et le libellé formation", () => {
    expect(dto.placesTotal).toBe(10);
    expect(dto.placesRestantes).toBe(8);
    expect(dto.formation).toBe("SSIAP 1");
    expect(dto.dateDebut).toBe("2026-03-01T09:00:00.000Z");
  });
});
