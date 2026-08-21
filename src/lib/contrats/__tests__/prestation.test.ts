import { describe, it, expect } from "vitest";
import { computeContratTotals, type ContratData } from "@/lib/contrats/prestation";

const base = (over: Partial<ContratData> = {}): ContratData => ({
  reference: "CP-TEST",
  palier: "CROISSANCE",
  formuleNom: "Croissance",
  montantMensuel: 349,
  remisePct: 0,
  engagement: "MENSUEL",
  options: [],
  packs: [],
  fraisMiseEnService: 0,
  ...over,
});

describe("computeContratTotals() — ventilation devis", () => {
  it("abonnement seul, mensuel, avec frais de mise en service", () => {
    const t = computeContratTotals(base({ fraisMiseEnService: 890 }));
    expect(t.abonnementNet).toBe(349);
    expect(t.recurrentMois).toBe(349);
    expect(t.oneTimeTotal).toBe(890);
    expect(t.encaisseSignature).toBe(349 + 890);
  });

  it("options souscrites sur Pro (facturées) + frais", () => {
    const t = computeContratTotals(base({ palier: "PRO", montantMensuel: 189, options: ["site-vitrine", "leads"], fraisMiseEnService: 490 }));
    expect(t.optionsMois).toBe(148); // 79 + 69
    expect(t.recurrentMois).toBe(337); // 189 + 148
    expect(t.oneTimeTotal).toBe(490);
    expect(t.encaisseSignature).toBe(337 + 490);
  });

  it("une option incluse au palier n'est pas facturée", () => {
    const t = computeContratTotals(base({ palier: "CROISSANCE", options: ["site-vitrine"] }));
    expect(t.optionsMois).toBe(0);
  });

  it("pack métier : récurrent mensuel + activation one-time", () => {
    const t = computeContratTotals(base({ palier: "PRO", montantMensuel: 189, packs: ["pack-securite"], fraisMiseEnService: 490 }));
    expect(t.packsMois).toBe(39);
    expect(t.recurrentMois).toBe(228); // 189 + 39
    expect(t.activationUnique).toBe(250);
    expect(t.oneTimeTotal).toBe(740); // 490 + 250
  });

  it("Pionnier annuel prépayé : remise 30 %, frais + activation OFFERTS, 12 mois encaissés", () => {
    const t = computeContratTotals(base({
      remisePct: 30,
      engagement: "ANNUEL",
      packs: ["pack-securite"],
      fraisMiseEnService: 0,
      pionnier: { variante: "ANNUEL_12M_PREPAYE", prixGele: true },
    }));
    expect(t.abonnementNet).toBe(244.3); // 349 × 0,7
    expect(t.recurrentMois).toBe(283.3); // 244,3 + 39
    expect(t.fraisUnique).toBe(0);
    expect(t.activationUnique).toBe(0); // offert
    expect(t.oneTimeTotal).toBe(0);
    expect(t.totalEngagement).toBe(3399.6); // 283,3 × 12
    expect(t.encaisseSignature).toBe(3399.6);
  });
});
