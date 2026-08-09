import { describe, it, expect } from "vitest";
import { detectSeparator, splitCsvLine, normalizeHeader } from "@/lib/growth/csv";

describe("detectSeparator()", () => {
  it("préfère ; quand majoritaire (export Excel FR)", () => {
    expect(detectSeparator("nom;email;telephone")).toBe(";");
  });
  it("détecte , sinon", () => {
    expect(detectSeparator("name,email,phone")).toBe(",");
  });
  it("à égalité (aucun des deux) → ; par défaut", () => {
    expect(detectSeparator("email")).toBe(";");
  });
});

describe("splitCsvLine()", () => {
  it("découpe une ligne simple", () => {
    expect(splitCsvLine("Jean Dupont;jean@of.fr;0601020304", ";")).toEqual([
      "Jean Dupont", "jean@of.fr", "0601020304",
    ]);
  });
  it("gère les champs entre guillemets contenant le séparateur", () => {
    expect(splitCsvLine('"Dupont; Jean";jean@of.fr', ";")).toEqual(["Dupont; Jean", "jean@of.fr"]);
  });
  it("gère les guillemets doublés (échappement CSV)", () => {
    expect(splitCsvLine('"Société ""Alpha""";contact@alpha.fr', ";")).toEqual([
      'Société "Alpha"', "contact@alpha.fr",
    ]);
  });
  it("conserve les champs vides", () => {
    expect(splitCsvLine("a;;c", ";")).toEqual(["a", "", "c"]);
  });
});

describe("normalizeHeader()", () => {
  it("minuscules et sans accents", () => {
    expect(normalizeHeader("Téléphone")).toBe("telephone");
    expect(normalizeHeader("E-MAIL")).toBe("e-mail");
    expect(normalizeHeader("Société")).toBe("societe");
  });
});
