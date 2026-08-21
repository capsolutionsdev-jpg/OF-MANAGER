import { describe, it, expect } from "vitest";
import {
  OPTIONS,
  optionByKey,
  optionStatut,
  totalOptionsMois,
  PACKS_METIER,
  packByKey,
  packDisponible,
  totalPacksMois,
  totalPacksActivation,
  fraisMiseEnService,
} from "@/lib/options";
import { PLANS } from "@/lib/plans";

describe("optionStatut() — disponibilité par palier", () => {
  it("option d'acquisition : indisponible sur Indépendant, souscriptible sur Pro, incluse dès Croissance", () => {
    const site = optionByKey("site-vitrine")!;
    expect(optionStatut(site, "INDEPENDANT")).toBe("indisponible");
    expect(optionStatut(site, "PRO")).toBe("souscriptible");
    expect(optionStatut(site, "CROISSANCE")).toBe("incluse");
    expect(optionStatut(site, "RESEAU")).toBe("incluse");
  });
  it("e-learning : souscriptible dès Indépendant, incluse dès Pro", () => {
    const el = optionByKey("elearning")!;
    expect(optionStatut(el, "INDEPENDANT")).toBe("souscriptible");
    expect(optionStatut(el, "PRO")).toBe("incluse");
  });
});

describe("totalOptionsMois() — ne facture que le souscriptible", () => {
  it("Pro + site + leads + IA = 197 €/mois", () => {
    expect(totalOptionsMois(["site-vitrine", "leads", "ia"], "PRO")).toBe(197);
  });
  it("les mêmes options sur Croissance = 0 (déjà incluses)", () => {
    expect(totalOptionsMois(["site-vitrine", "leads", "ia"], "CROISSANCE")).toBe(0);
  });
  it("une option indisponible n'est jamais facturée", () => {
    expect(totalOptionsMois(["site-vitrine"], "INDEPENDANT")).toBe(0);
  });
});

describe("règle d'or anti-cannibalisation", () => {
  it("les options d'acquisition ne s'ouvrent jamais sur Indépendant", () => {
    for (const key of ["site-vitrine", "leads", "ia"]) {
      expect(optionStatut(optionByKey(key)!, "INDEPENDANT")).toBe("indisponible");
    }
  });
  it("Pro + options d'acquisition reste PLUS CHER que Croissance", () => {
    const proTotal = PLANS.PRO.price + totalOptionsMois(["site-vitrine", "leads", "ia"], "PRO");
    expect(proTotal).toBeGreaterThan(PLANS.CROISSANCE.price);
  });
});

describe("packs métier", () => {
  it("indisponibles avant Pro", () => {
    expect(packDisponible(packByKey("pack-securite")!, "INDEPENDANT")).toBe(false);
    expect(packDisponible(packByKey("pack-securite")!, "PRO")).toBe(true);
  });
  it("activation + récurrent (Sécurité + Transport)", () => {
    expect(totalPacksActivation(["pack-securite", "pack-transport"])).toBe(500);
    expect(totalPacksMois(["pack-securite", "pack-transport"])).toBe(78);
  });
  it("chaque pack débloque des fonctionnalités métier", () => {
    expect(packByKey("pack-securite")!.features).toContain("jurys");
    expect(packByKey("pack-transport")!.features).toContain("parcours-t3p");
  });
});

describe("frais de mise en service (one-time)", () => {
  it("190 / 490 / 890 / 1500 par palier", () => {
    expect(fraisMiseEnService("INDEPENDANT")).toBe(190);
    expect(fraisMiseEnService("PRO")).toBe(490);
    expect(fraisMiseEnService("CROISSANCE")).toBe(890);
    expect(fraisMiseEnService("RESEAU")).toBe(1500);
  });
});

describe("intégrité du catalogue", () => {
  it("toutes les clés d'options/packs sont uniques", () => {
    const keys = [...OPTIONS.map((o) => o.key), ...PACKS_METIER.map((p) => p.key)];
    expect(new Set(keys).size).toBe(keys.length);
  });
});
