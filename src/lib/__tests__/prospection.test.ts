import { describe, it, expect } from "vitest";
import {
  axesQualification,
  chaudCount,
  appelUrgent,
  temperature,
  type QualifInput,
} from "@/lib/growth/qualification";
import {
  PIPELINE_STAGES,
  LEAD_STATUTS,
  stageIndex,
  nextStage,
  prevStage,
  stageLabel,
} from "@/lib/growth/pipeline";

const chaudTotal: QualifInput = {
  verticale: "securite",
  outilActuel: "aucun",
  echeanceQualiopi: "moins_6_mois",
  volumeStagiairesMois: 300,
  malARemplir: true,
};
const froidTotal: QualifInput = {
  verticale: "autre",
  outilActuel: "concurrent",
  echeanceQualiopi: "non_concerne",
  volumeStagiairesMois: 5000,
  malARemplir: false,
};

describe("qualification — 5 axes chaud/froid", () => {
  it("expose exactement 5 axes", () => {
    expect(axesQualification({}).map((a) => a.key)).toEqual([
      "outil", "qualiopi", "verticale", "taille", "enjeu",
    ]);
  });
  it("prospect idéal = 5 chauds, prospect hors cible = 0", () => {
    expect(chaudCount(chaudTotal)).toBe(5);
    expect(chaudCount(froidTotal)).toBe(0);
  });
  it("« 3 chauds = appel sous 24 h »", () => {
    const troisChauds: QualifInput = { outilActuel: "excel", echeanceQualiopi: "moins_6_mois", verticale: "transport" };
    expect(chaudCount(troisChauds)).toBe(3);
    expect(appelUrgent(troisChauds)).toBe(true);
    const deuxChauds: QualifInput = { outilActuel: "excel", verticale: "transport" };
    expect(chaudCount(deuxChauds)).toBe(2);
    expect(appelUrgent(deuxChauds)).toBe(false);
  });
  it("taille : 150-800 chaud, >3000 froid", () => {
    expect(axesQualification({ volumeStagiairesMois: 300 }).find((a) => a.key === "taille")!.chaud).toBe(true);
    expect(axesQualification({ volumeStagiairesMois: 5000 }).find((a) => a.key === "taille")!.chaud).toBe(false);
    expect(axesQualification({ volumeStagiairesMois: 50 }).find((a) => a.key === "taille")!.chaud).toBe(false);
  });
  it("température : chaud / tiède / froid", () => {
    expect(temperature(chaudTotal)).toBe("chaud");
    expect(temperature({ verticale: "securite" })).toBe("tiede");
    expect(temperature(froidTotal)).toBe("froid");
    expect(temperature({})).toBe("froid");
  });
});

describe("pipeline — 8 étapes", () => {
  it("8 étapes + PERDU = 9 statuts valides", () => {
    expect(PIPELINE_STAGES).toHaveLength(8);
    expect(LEAD_STATUTS).toHaveLength(9);
  });
  it("ordre des étapes", () => {
    expect(stageIndex("FICHIER")).toBe(0);
    expect(stageIndex("SIGNE")).toBe(7);
    expect(stageIndex("PERDU")).toBe(-1);
  });
  it("navigation next/prev", () => {
    expect(nextStage("FICHIER")).toBe("CONTACTE");
    expect(nextStage("SIGNE")).toBeNull();
    expect(prevStage("CONTACTE")).toBe("FICHIER");
    expect(prevStage("FICHIER")).toBeNull();
  });
  it("libellés", () => {
    expect(stageLabel("SIGNE")).toBe("Signé");
    expect(stageLabel("PERDU")).toBe("Perdu");
  });
});
