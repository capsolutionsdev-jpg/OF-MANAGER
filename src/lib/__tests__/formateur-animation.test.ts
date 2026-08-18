import { describe, it, expect } from "vitest";
import { joursSession, nbJoursFormateur, parseAnimation, joursEnConflit } from "@/lib/formateurs/animation";

describe("animation formateur — jours de la session", () => {
  it("liste les jours inclus (sans dérive de fuseau)", () => {
    expect(joursSession("2026-09-01", "2026-09-03")).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
  });
  it("un seul jour → 1 date", () => {
    expect(joursSession("2026-09-10", "2026-09-10")).toEqual(["2026-09-10"]);
  });
  it("passage de mois", () => {
    expect(joursSession("2026-09-30", "2026-10-01")).toEqual(["2026-09-30", "2026-10-01"]);
  });
  it("dates vides ou inversées → []", () => {
    expect(joursSession("", "2026-09-03")).toEqual([]);
    expect(joursSession("2026-09-03", "2026-09-01")).toEqual([]);
  });
  it("exclut les week-ends (samedi 05 + dimanche 06 sautés)", () => {
    // 04 = vendredi, 05 = samedi, 06 = dimanche, 07 = lundi
    expect(joursSession("2026-09-04", "2026-09-07")).toEqual(["2026-09-04", "2026-09-07"]);
  });
  it("session entièrement le week-end → repli (jours gardés, jamais vide)", () => {
    expect(joursSession("2026-09-05", "2026-09-06")).toEqual(["2026-09-05", "2026-09-06"]);
  });
});

describe("animation formateur — nombre de jours facturables", () => {
  const total = 5;
  it("complet → total de la session", () => {
    expect(nbJoursFormateur([{ formateurId: "f1", complet: true, jours: [] }], "f1", total)).toBe(5);
  });
  it("partiel → nombre de jours cochés", () => {
    expect(nbJoursFormateur([{ formateurId: "f1", complet: false, jours: ["2026-09-01", "2026-09-02"] }], "f1", total)).toBe(2);
  });
  it("config absente pour ce formateur → total (complet par défaut)", () => {
    expect(nbJoursFormateur([], "f1", total)).toBe(5);
    expect(nbJoursFormateur(null, "f1", total)).toBe(5);
  });
  it("partiel borné au total", () => {
    expect(nbJoursFormateur([{ formateurId: "f1", complet: false, jours: Array(9).fill("x") }], "f1", total)).toBe(5);
  });
});

describe("animation formateur — parseAnimation (valeur base)", () => {
  it("normalise un JSON valide (complet par défaut si absent)", () => {
    const r = parseAnimation([{ formateurId: "f1", jours: ["2026-09-01"] }, { formateurId: "f2", complet: false, jours: ["2026-09-02"] }]);
    expect(r).toEqual([
      { formateurId: "f1", complet: true, jours: ["2026-09-01"] },
      { formateurId: "f2", complet: false, jours: ["2026-09-02"] },
    ]);
  });
  it("ignore le bruit (non-objets, sans formateurId)", () => {
    expect(parseAnimation([null, 3, { jours: [] }])).toEqual([]);
    expect(parseAnimation("pas un tableau")).toEqual([]);
  });
});

describe("animation formateur — un jour = un seul formateur (joursEnConflit)", () => {
  const jours = ["2026-09-01", "2026-09-02", "2026-09-03"];
  it("jours disjoints → aucun conflit", () => {
    expect(
      joursEnConflit(
        [
          { formateurId: "f1", complet: false, jours: ["2026-09-01"] },
          { formateurId: "f2", complet: false, jours: ["2026-09-02", "2026-09-03"] },
        ],
        jours,
      ),
    ).toEqual([]);
  });
  it("même jour sur deux formateurs → conflit", () => {
    expect(
      joursEnConflit(
        [
          { formateurId: "f1", complet: false, jours: ["2026-09-01", "2026-09-02"] },
          { formateurId: "f2", complet: false, jours: ["2026-09-02"] },
        ],
        jours,
      ),
    ).toEqual(["2026-09-02"]);
  });
  it("deux « toute la session » → tous les jours en conflit", () => {
    expect(
      joursEnConflit(
        [
          { formateurId: "f1", complet: true, jours: [] },
          { formateurId: "f2", complet: true, jours: [] },
        ],
        jours,
      ),
    ).toEqual(jours);
  });
  it("complet + partiel → le jour du partiel est en conflit", () => {
    expect(
      joursEnConflit(
        [
          { formateurId: "f1", complet: true, jours: [] },
          { formateurId: "f2", complet: false, jours: ["2026-09-01"] },
        ],
        jours,
      ),
    ).toEqual(["2026-09-01"]);
  });
  it("un seul formateur → aucun conflit", () => {
    expect(joursEnConflit([{ formateurId: "f1", complet: true, jours: [] }], jours)).toEqual([]);
  });
});
