import { describe, it, expect } from "vitest";
import { normalizeSignatureName, isValidSignatureName } from "../signature";

describe("normalizeSignatureName", () => {
  it("compacte les espaces et trim", () => {
    expect(normalizeSignatureName("  Jean   Dupont  ")).toBe("Jean Dupont");
  });
  it("borne la longueur à 80 caractères", () => {
    expect(normalizeSignatureName("a".repeat(200))).toHaveLength(80);
  });
  it("renvoie une chaîne vide pour du blanc", () => {
    expect(normalizeSignatureName("   \n\t ")).toBe("");
  });
});

describe("isValidSignatureName", () => {
  it("rejette une saisie trop courte", () => {
    expect(isValidSignatureName(" a ")).toBe(false);
    expect(isValidSignatureName("")).toBe(false);
  });
  it("accepte un nom complet", () => {
    expect(isValidSignatureName("Jean Dupont")).toBe(true);
  });
});
