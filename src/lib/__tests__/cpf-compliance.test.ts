import { describe, it, expect } from "vitest";
import {
  MIN_JOURS_OUVRES,
  CIBLE_JOURS_OUVRES,
  businessDaysBefore,
  positionnementDeadline,
  estAnterieurConforme,
  evaluerConformiteCpf,
} from "@/lib/cpf-compliance";

// Semaine de référence (2026) :
//   lun 09-07 · mar 09-08 · … · ven 09-04 · sam 09-05 · dim 09-06 · lun 09-07
// (construction en composants LOCAUX pour éviter tout décalage de fuseau)
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe("cpf-compliance — antériorité du test / dossier CPF (jours ouvrés)", () => {
  it("expose la politique : blocage à J-1 ouvré, cible recommandée J-2", () => {
    expect(MIN_JOURS_OUVRES).toBe(1);
    expect(CIBLE_JOURS_OUVRES).toBe(2);
  });

  describe("businessDaysBefore — recule de N jours OUVRÉS (hors week-end)", () => {
    it("en semaine : mercredi − 1 = mardi", () => {
      expect(businessDaysBefore(d(2026, 9, 2), 1)).toEqual(d(2026, 9, 1));
    });
    it("franchit le week-end : lundi − 1 = vendredi", () => {
      expect(businessDaysBefore(d(2026, 9, 7), 1)).toEqual(d(2026, 9, 4));
    });
    it("lundi − 2 = jeudi", () => {
      expect(businessDaysBefore(d(2026, 9, 7), 2)).toEqual(d(2026, 9, 3));
    });
    it("mardi − 2 = vendredi (saute le week-end)", () => {
      expect(businessDaysBefore(d(2026, 9, 8), 2)).toEqual(d(2026, 9, 4));
    });
  });

  describe("positionnementDeadline — date limite de réalisation", () => {
    it("dossier lundi, J-1 ouvré → limite vendredi", () => {
      expect(positionnementDeadline(d(2026, 9, 7))).toEqual(d(2026, 9, 4));
    });
  });

  describe("estAnterieurConforme", () => {
    it("test vendredi, dossier lundi → conforme (J-1 ouvré)", () => {
      expect(estAnterieurConforme(d(2026, 9, 4), d(2026, 9, 7))).toBe(true);
    });
    it("test le jour même du dossier → NON conforme", () => {
      expect(estAnterieurConforme(d(2026, 9, 7), d(2026, 9, 7))).toBe(false);
    });
    it("test le dimanche avant un dossier lundi → NON conforme (week-end ne compte pas)", () => {
      expect(estAnterieurConforme(d(2026, 9, 6), d(2026, 9, 7))).toBe(false);
    });
    it("cible J-2 : test jeudi, dossier lundi → conforme", () => {
      expect(estAnterieurConforme(d(2026, 9, 3), d(2026, 9, 7), CIBLE_JOURS_OUVRES)).toBe(true);
    });
    it("cible J-2 : test vendredi, dossier lundi → NON conforme (1 seul jour ouvré)", () => {
      expect(estAnterieurConforme(d(2026, 9, 4), d(2026, 9, 7), CIBLE_JOURS_OUVRES)).toBe(false);
    });
    it("ignore l'heure : test vendredi 23h30 vs dossier lundi 8h → conforme", () => {
      expect(
        estAnterieurConforme(new Date(2026, 8, 4, 23, 30), new Date(2026, 8, 7, 8, 0)),
      ).toBe(true);
    });
  });

  describe("evaluerConformiteCpf — décision blocage / dérogation (cas 1-3)", () => {
    const dossier = d(2026, 9, 7); // lundi
    it("financement non CPF → rien à vérifier", () => {
      const r = evaluerConformiteCpf({ financementCpf: false, cpfDossierCreeLe: dossier, positionnementCompletedAt: null, derogation: false });
      expect(r.statut).toBe("NON_CPF");
      expect(r.bloquant).toBe(false);
    });
    it("CPF sans date de dossier → rien à bloquer (dossier pas encore ouvert)", () => {
      const r = evaluerConformiteCpf({ financementCpf: true, cpfDossierCreeLe: null, positionnementCompletedAt: null, derogation: false });
      expect(r.statut).toBe("DOSSIER_ABSENT");
      expect(r.bloquant).toBe(false);
    });
    it("CPF + dossier mais test non réalisé → bloquant (TEST_MANQUANT)", () => {
      const r = evaluerConformiteCpf({ financementCpf: true, cpfDossierCreeLe: dossier, positionnementCompletedAt: null, derogation: false });
      expect(r.statut).toBe("TEST_MANQUANT");
      expect(r.bloquant).toBe(true);
    });
    it("CPF + test vendredi avant dossier lundi → conforme", () => {
      const r = evaluerConformiteCpf({ financementCpf: true, cpfDossierCreeLe: dossier, positionnementCompletedAt: d(2026, 9, 4), derogation: false });
      expect(r.statut).toBe("CONFORME");
      expect(r.bloquant).toBe(false);
    });
    it("CPF + test le jour même → non antérieur, bloquant", () => {
      const r = evaluerConformiteCpf({ financementCpf: true, cpfDossierCreeLe: dossier, positionnementCompletedAt: dossier, derogation: false });
      expect(r.statut).toBe("NON_ANTERIEUR");
      expect(r.bloquant).toBe(true);
    });
    it("dérogation lève le blocage mais garde la trace « non conforme »", () => {
      const r = evaluerConformiteCpf({ financementCpf: true, cpfDossierCreeLe: dossier, positionnementCompletedAt: dossier, derogation: true });
      expect(r.statut).toBe("DEROGATION");
      expect(r.bloquant).toBe(false);
    });
    it("expose la date limite quand le dossier est renseigné", () => {
      const r = evaluerConformiteCpf({ financementCpf: true, cpfDossierCreeLe: dossier, positionnementCompletedAt: d(2026, 9, 4), derogation: false });
      expect(r.deadline).toEqual(d(2026, 9, 4));
    });
  });
});
