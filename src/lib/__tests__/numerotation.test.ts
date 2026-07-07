import { describe, it, expect } from "vitest";
import { maxSuffix } from "@/lib/numerotation";

describe("maxSuffix() — amorçage de la numérotation depuis l'historique", () => {
  it("extrait le plus grand suffixe numérique", () => {
    expect(maxSuffix(["DEV-2026-0001", "DEV-2026-0007", "DEV-2026-0003"])).toBe(7);
    expect(maxSuffix(["CIV-2026-0042"])).toBe(42);
  });

  it("renvoie 0 pour une liste vide (première émission)", () => {
    expect(maxSuffix([])).toBe(0);
  });

  it("ignore les entrées non numériques", () => {
    expect(maxSuffix(["DEV-2026-xxxx", "DEV-2026-0005"])).toBe(5);
  });
});
