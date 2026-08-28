import { describe, it, expect } from "vitest";
import { estJourFerie } from "@/lib/jours-feries";

describe("estJourFerie() — jours fériés légaux français (A06-019)", () => {
  it("reconnaît les jours fériés fixes", () => {
    expect(estJourFerie(new Date(2026, 0, 1))).toBe(true); // Jour de l'an
    expect(estJourFerie(new Date(2026, 4, 1))).toBe(true); // Fête du travail (1 mai)
    expect(estJourFerie(new Date(2026, 4, 8))).toBe(true); // Victoire 1945 (8 mai)
    expect(estJourFerie(new Date(2026, 6, 14))).toBe(true); // Fête nationale (14 juil)
    expect(estJourFerie(new Date(2026, 7, 15))).toBe(true); // Assomption
    expect(estJourFerie(new Date(2026, 10, 11))).toBe(true); // Armistice
    expect(estJourFerie(new Date(2026, 11, 25))).toBe(true); // Noël
  });

  it("reconnaît les jours fériés mobiles (Pâques 2026 = 5 avril)", () => {
    expect(estJourFerie(new Date(2026, 3, 6))).toBe(true); // Lundi de Pâques
    expect(estJourFerie(new Date(2026, 4, 14))).toBe(true); // Ascension (Pâques + 39)
    expect(estJourFerie(new Date(2026, 4, 25))).toBe(true); // Lundi de Pentecôte (+50)
  });

  it("un jour ouvré normal n'est pas férié", () => {
    expect(estJourFerie(new Date(2026, 4, 4))).toBe(false); // lundi 4 mai 2026
    expect(estJourFerie(new Date(2026, 2, 17))).toBe(false); // mardi 17 mars 2026
  });
});
