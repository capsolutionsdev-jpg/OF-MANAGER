import { describe, it, expect } from "vitest";
import {
  planKeyForOrg,
  featuresForFormule,
  euros,
  PLANS,
  EXTRA_SEAT_PRICE_EUR,
} from "@/lib/plans";
import { ADVANCED_FEATURE_KEYS, FEATURE_KEYS } from "@/lib/features";

describe("planKeyForOrg() — résolution de la formule", () => {
  it("respecte la formule posée explicitement", () => {
    expect(planKeyForOrg("BASIQUE", [])).toBe("BASIQUE");
    expect(planKeyForOrg("MEDIUM", [])).toBe("MEDIUM");
    expect(planKeyForOrg("COMPLET", [])).toBe("COMPLET");
  });
  it("estime depuis les modules avancés si aucune formule", () => {
    expect(planKeyForOrg(null, [])).toBe("BASIQUE"); // 0 module avancé
    expect(planKeyForOrg(null, [ADVANCED_FEATURE_KEYS[0]])).toBe("MEDIUM"); // 1
    expect(planKeyForOrg(null, ADVANCED_FEATURE_KEYS.slice(0, 5))).toBe("COMPLET"); // >= 5
  });
  it("tolère formule invalide → estimation", () => {
    expect(planKeyForOrg("INEXISTANTE", [])).toBe("BASIQUE");
  });
});

describe("comptes inclus & prix du siège", () => {
  it("Basique 3, Medium 5, Complet illimité", () => {
    expect(PLANS.BASIQUE.maxComptes).toBe(3);
    expect(PLANS.MEDIUM.maxComptes).toBe(5);
    expect(PLANS.COMPLET.maxComptes).toBeNull();
  });
  it("le compte supplémentaire vaut 20 € HT", () => {
    expect(EXTRA_SEAT_PRICE_EUR).toBe(20);
  });
});

describe("featuresForFormule()", () => {
  it("le support est inclus partout", () => {
    expect(featuresForFormule("BASIQUE")).toContain("support");
    expect(featuresForFormule("MEDIUM")).toContain("support");
    expect(featuresForFormule("COMPLET")).toContain("support");
  });
  it("Complet = toutes les fonctionnalités", () => {
    expect(featuresForFormule("COMPLET").length).toBe(FEATURE_KEYS.length);
  });
  it("Basique ⊂ Medium ⊂ Complet (croissant)", () => {
    expect(featuresForFormule("BASIQUE").length).toBeLessThan(featuresForFormule("MEDIUM").length);
    expect(featuresForFormule("MEDIUM").length).toBeLessThanOrEqual(featuresForFormule("COMPLET").length);
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
