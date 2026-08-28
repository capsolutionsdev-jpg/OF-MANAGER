import { describe, it, expect } from "vitest";
import { calcDevisTotals } from "@/lib/factures/devis-calc";

describe("calcDevisTotals() — totaux devis arrondis au centime (A06-008)", () => {
  it("arrondit chaque ligne puis la somme (méthode calcMontants)", () => {
    const t = calcDevisTotals([{ quantite: 3, puHT: 33.33 }], 20);
    expect(t.montantHT).toBe(99.99);
    expect(t.montantTva).toBe(20.0); // round2(99.99 * 0.2) = round2(19.998) = 20.00
    expect(t.montantTTC).toBe(119.99);
    // Cohérence : HT + TVA = TTC, et TVA = TTC − HT
    expect(t.montantTTC).toBe(Math.round((t.montantHT + t.montantTva) * 100) / 100);
    expect(t.montantTva).toBe(Math.round((t.montantTTC - t.montantHT) * 100) / 100);
  });

  it("cas fractionnaire : 7,5 h × 66,67 €, TVA 20 % → 500,03 / 100,01 / 600,04", () => {
    const t = calcDevisTotals([{ quantite: 7.5, puHT: 66.67 }], 20);
    expect(t.montantHT).toBe(500.03);
    expect(t.montantTva).toBe(100.01); // et NON 100,00 (le bug ttc−ht non arrondi)
    expect(t.montantTTC).toBe(600.04);
  });

  it("plusieurs lignes + TVA 0 (exonéré) → TTC = HT", () => {
    const t = calcDevisTotals([{ quantite: 2, puHT: 10 }, { quantite: 1, puHT: 5.5 }], 0);
    expect(t.montantHT).toBe(25.5);
    expect(t.montantTva).toBe(0);
    expect(t.montantTTC).toBe(25.5);
  });
});
