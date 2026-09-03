import { describe, it, expect } from "vitest";
import { isValidSiret, normalizeSiret, siretOptionalSchema } from "@/lib/validators/siret";

// A10-010 — Le SIRET alimente les conventions/contrats signés : il doit être
// refusé à la saisie s'il est erroné (14 chiffres + clé de Luhn).

describe("isValidSiret", () => {
  it("accepte un SIRET valide (clé de Luhn correcte)", () => {
    expect(isValidSiret("73282932000074")).toBe(true);
  });

  it("tolère les espaces de saisie", () => {
    expect(isValidSiret("732 829 320 00074")).toBe(true);
  });

  it("refuse une clé de contrôle erronée", () => {
    expect(isValidSiret("73282932000073")).toBe(false);
  });

  it("refuse un nombre de chiffres incorrect", () => {
    expect(isValidSiret("123")).toBe(false);
    expect(isValidSiret("732829320000740")).toBe(false); // 15 chiffres
  });

  it("refuse la présence de lettres", () => {
    expect(isValidSiret("7328293200007A")).toBe(false);
  });
});

describe("normalizeSiret", () => {
  it("ne conserve que les chiffres", () => {
    expect(normalizeSiret("732 829 320 00074")).toBe("73282932000074");
    expect(normalizeSiret("FR-732.829")).toBe("732829");
  });
});

describe("siretOptionalSchema", () => {
  it("accepte une valeur vide (champ optionnel)", () => {
    expect(siretOptionalSchema.safeParse("").success).toBe(true);
    expect(siretOptionalSchema.safeParse(undefined).success).toBe(true);
  });

  it("accepte un SIRET valide et rejette un SIRET erroné", () => {
    expect(siretOptionalSchema.safeParse("73282932000074").success).toBe(true);
    expect(siretOptionalSchema.safeParse("00000000000000").success).toBe(false);
  });
});
