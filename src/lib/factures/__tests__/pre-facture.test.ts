import { describe, it, expect } from "vitest";
import { buildPreFacture } from "@/lib/factures/pre-facture";

describe("buildPreFacture() — facture pré-formatée exportable (A06-003)", () => {
  it("organisme assujetti : TVA 20 % par défaut, totaux au centime", () => {
    const pf = buildPreFacture({
      clientNom: "Acme SARL",
      designation: "Formation SSIAP 1",
      montantHT: 1000,
      assujettiTva: true,
    });
    expect(pf.tauxTva).toBe(20);
    expect(pf.montantHT).toBe(1000);
    expect(pf.montantTva).toBe(200);
    expect(pf.montantTTC).toBe(1200);
    expect(pf.exonere).toBe(false);
    expect(pf.mentionTva).toContain("20");
  });

  it("organisme exonéré : TVA 0 % + mention légale 261-4-4°", () => {
    const pf = buildPreFacture({
      clientNom: "Jean Dupont",
      designation: "Recyclage SST",
      montantHT: 300,
      assujettiTva: false,
    });
    expect(pf.tauxTva).toBe(0);
    expect(pf.montantTva).toBe(0);
    expect(pf.montantTTC).toBe(300);
    expect(pf.exonere).toBe(true);
    expect(pf.mentionTva).toContain("261-4-4");
  });

  it("taux de TVA personnalisé respecté (organisme assujetti)", () => {
    const pf = buildPreFacture({
      clientNom: "X",
      designation: "Y",
      montantHT: 100,
      assujettiTva: true,
      tauxTvaDefaut: 10,
    });
    expect(pf.tauxTva).toBe(10);
    expect(pf.montantTTC).toBe(110);
  });
});
