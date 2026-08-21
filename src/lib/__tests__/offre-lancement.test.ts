import { describe, it, expect } from "vitest";
import {
  OFFRE_PIONNIERS,
  appliquerPionniers,
  prixMensuelPionnier,
  montantSignaturePionnier,
  placesRestantes,
} from "@/lib/offre-lancement";

describe("offre « Pionniers » — 15 places", () => {
  it("expose 15 places et deux variantes", () => {
    expect(OFFRE_PIONNIERS.places).toBe(15);
    expect(OFFRE_PIONNIERS.variantes.MENSUEL_6M.remisePct).toBe(40);
    expect(OFFRE_PIONNIERS.variantes.ANNUEL_12M_PREPAYE.remisePct).toBe(30);
  });
});

describe("appliquerPionniers()", () => {
  it("variante mensuelle : −40 %, 6 mois, sans engagement", () => {
    const a = appliquerPionniers("MENSUEL_6M");
    expect(a.remisePct).toBe(40);
    expect(a.engagement).toBe("MENSUEL");
    expect(a.prepaye).toBe(false);
    expect(a.dureeMois).toBe(6);
    expect(a.miseEnServiceOfferte).toBe(true);
    expect(a.activationPackOfferte).toBe(true);
    expect(a.prixGele).toBe(true);
  });
  it("variante annuelle prépayée : −30 %, 12 mois, engagement annuel", () => {
    const a = appliquerPionniers("ANNUEL_12M_PREPAYE");
    expect(a.remisePct).toBe(30);
    expect(a.engagement).toBe("ANNUEL");
    expect(a.prepaye).toBe(true);
    expect(a.dureeMois).toBe(12);
  });
});

describe("montants Pionniers (base Croissance 349 €)", () => {
  it("mensuel : net 209,40 €/mois", () => {
    expect(prixMensuelPionnier(349, "MENSUEL_6M")).toBe(209.4);
    expect(montantSignaturePionnier(349, "MENSUEL_6M")).toBe(209.4);
  });
  it("annuel prépayé : ~2 932 € encaissés à la signature", () => {
    expect(prixMensuelPionnier(349, "ANNUEL_12M_PREPAYE")).toBe(244.3);
    expect(montantSignaturePionnier(349, "ANNUEL_12M_PREPAYE")).toBe(2931.6);
  });
});

describe("placesRestantes()", () => {
  it("15 au départ, 0 une fois complet, jamais négatif", () => {
    expect(placesRestantes(0)).toBe(15);
    expect(placesRestantes(15)).toBe(0);
    expect(placesRestantes(20)).toBe(0);
  });
});
