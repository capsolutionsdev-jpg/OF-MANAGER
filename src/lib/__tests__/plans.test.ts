import { describe, it, expect } from "vitest";
import {
  planKeyForOrg,
  featuresForFormule,
  euros,
  eurosDoc,
  PLANS,
  EXTRA_SEAT_PRICE_EUR,
} from "@/lib/plans";
import { ADVANCED_FEATURE_KEYS, FEATURE_KEYS } from "@/lib/features";

describe("planKeyForOrg() — résolution de la formule", () => {
  it("respecte la formule posée explicitement", () => {
    expect(planKeyForOrg("INDEPENDANT", [])).toBe("INDEPENDANT");
    expect(planKeyForOrg("PRO", [])).toBe("PRO");
    expect(planKeyForOrg("CROISSANCE", [])).toBe("CROISSANCE");
    expect(planKeyForOrg("RESEAU", [])).toBe("RESEAU");
  });
  it("estime depuis les modules avancés si aucune formule", () => {
    expect(planKeyForOrg(null, [])).toBe("INDEPENDANT"); // 0 module avancé
    expect(planKeyForOrg(null, [ADVANCED_FEATURE_KEYS[0]])).toBe("PRO"); // 1
    expect(planKeyForOrg(null, ADVANCED_FEATURE_KEYS.slice(0, 5))).toBe("CROISSANCE"); // >= 5
    expect(planKeyForOrg(null, ADVANCED_FEATURE_KEYS.slice(0, 10))).toBe("RESEAU"); // >= 10
  });
  it("tolère formule invalide → estimation", () => {
    expect(planKeyForOrg("INEXISTANTE", [])).toBe("INDEPENDANT");
  });
});

describe("comptes inclus & prix du siège", () => {
  it("Indépendant 1, Pro 2, Croissance 5, Réseau illimité", () => {
    expect(PLANS.INDEPENDANT.maxComptes).toBe(1);
    expect(PLANS.PRO.maxComptes).toBe(2);
    expect(PLANS.CROISSANCE.maxComptes).toBe(5);
    expect(PLANS.RESEAU.maxComptes).toBeNull();
  });
  it("le compte supplémentaire vaut 20 € HT", () => {
    expect(EXTRA_SEAT_PRICE_EUR).toBe(20);
  });
});

describe("grille tarifaire (plan de lancement v21/08)", () => {
  it("prix mensuels HT : 59 / 189 / 349 / 690", () => {
    expect(PLANS.INDEPENDANT.price).toBe(59);
    expect(PLANS.PRO.price).toBe(189);
    expect(PLANS.CROISSANCE.price).toBe(349);
    expect(PLANS.RESEAU.price).toBe(690);
  });
  it("prix annuel −15 % : 602 / 1928 / 3560 / sur devis", () => {
    expect(PLANS.INDEPENDANT.priceYear).toBe(602);
    expect(PLANS.PRO.priceYear).toBe(1928);
    expect(PLANS.CROISSANCE.priceYear).toBe(3560);
    expect(PLANS.RESEAU.priceYear).toBeNull();
  });
  it("quotas stagiaires/mois : 100 / 300 / 800 / illimité", () => {
    expect(PLANS.INDEPENDANT.inscriptionsMois).toBe(100);
    expect(PLANS.PRO.inscriptionsMois).toBe(300);
    expect(PLANS.CROISSANCE.inscriptionsMois).toBe(800);
    expect(PLANS.RESEAU.inscriptionsMois).toBeNull();
  });
  it("quotas e-mails/mois : 2000 / 10000 / illimité / illimité", () => {
    expect(PLANS.INDEPENDANT.emailsMois).toBe(2000);
    expect(PLANS.PRO.emailsMois).toBe(10000);
    expect(PLANS.CROISSANCE.emailsMois).toBeNull();
    expect(PLANS.RESEAU.emailsMois).toBeNull();
  });
  it("quotas SMS/mois : 0 / 200 / 800 / 2500", () => {
    expect(PLANS.INDEPENDANT.smsMois).toBe(0);
    expect(PLANS.PRO.smsMois).toBe(200);
    expect(PLANS.CROISSANCE.smsMois).toBe(800);
    expect(PLANS.RESEAU.smsMois).toBe(2500);
  });
  it("formateurs inclus : 1 / 3 / illimité / illimité", () => {
    expect(PLANS.INDEPENDANT.formateurs).toBe(1);
    expect(PLANS.PRO.formateurs).toBe(3);
    expect(PLANS.CROISSANCE.formateurs).toBeNull();
    expect(PLANS.RESEAU.formateurs).toBeNull();
  });
});

describe("featuresForFormule()", () => {
  it("le support est inclus partout", () => {
    expect(featuresForFormule("INDEPENDANT")).toContain("support");
    expect(featuresForFormule("PRO")).toContain("support");
    expect(featuresForFormule("CROISSANCE")).toContain("support");
    expect(featuresForFormule("RESEAU")).toContain("support");
  });
  it("Réseau = toutes les fonctionnalités", () => {
    expect(featuresForFormule("RESEAU").length).toBe(FEATURE_KEYS.length);
  });
  it("Indépendant ⊂ Pro ⊂ Croissance ⊆ Réseau (croissant)", () => {
    expect(featuresForFormule("INDEPENDANT").length).toBeLessThan(featuresForFormule("PRO").length);
    expect(featuresForFormule("PRO").length).toBeLessThan(featuresForFormule("CROISSANCE").length);
    expect(featuresForFormule("CROISSANCE").length).toBeLessThanOrEqual(featuresForFormule("RESEAU").length);
  });
});

describe("euros()", () => {
  it("formate en euros sans décimales", () => {
    const s = euros(826);
    expect(s).toContain("826");
    expect(s).toContain("€");
    expect(s).not.toContain(",00");
  });
  it("gère zéro", () => {
    expect(euros(0)).toContain("0");
  });
});

describe("eurosDoc() — montants de documents légaux (2 décimales, A06-002)", () => {
  // Intl insère une espace fine insécable (U+202F/U+00A0) avant le symbole €.
  const norm = (s: string) => s.replace(/[  ]/g, " ");
  it("affiche TOUJOURS deux décimales (pas d'arrondi à l'euro)", () => {
    expect(norm(eurosDoc(160.65))).toBe("160,65 €");
    expect(norm(eurosDoc(0.01))).toBe("0,01 €");
    expect(norm(eurosDoc(113.4))).toBe("113,40 €");
    expect(norm(eurosDoc(178.8))).toBe("178,80 €");
  });
  it("gère zéro et les entiers avec deux décimales", () => {
    expect(norm(eurosDoc(0))).toBe("0,00 €");
    expect(norm(eurosDoc(59))).toBe("59,00 €");
  });
});
