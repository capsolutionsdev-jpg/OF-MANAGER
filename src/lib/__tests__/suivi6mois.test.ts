import { describe, it, expect } from "vitest";
import {
  echeanceSuivi6Mois,
  suivi6moisStatut,
  suivi6moisAutoEligible,
  SUIVI_6MOIS_GRACE_DAYS,
  type Suivi6MoisEtat,
} from "@/lib/suivi6mois";

// Formation terminée le 15/01/2026 → échéance J+6 = 15/07/2026.
const DATE_FIN = new Date(2026, 0, 15);
const ECHEANCE = new Date(2026, 6, 15); // 15/07/2026
const etat = (over: Partial<Suivi6MoisEtat> = {}): Suivi6MoisEtat => ({
  dateFin: DATE_FIN,
  suivi6moisSentAt: null,
  suivi6moisCompletedAt: null,
  ...over,
});

describe("echeanceSuivi6Mois", () => {
  it("renvoie la date de fin + 6 mois", () => {
    expect(echeanceSuivi6Mois(DATE_FIN).getTime()).toBe(ECHEANCE.getTime());
  });
});

describe("suivi6moisStatut", () => {
  it("répondu (completedAt) → FAIT, même si l'envoi n'a pas été tracé", () => {
    expect(
      suivi6moisStatut(etat({ suivi6moisSentAt: null, suivi6moisCompletedAt: new Date(2026, 7, 1) }), new Date(2026, 7, 2)),
    ).toBe("FAIT");
  });

  it("envoyé mais pas de réponse → EN_ATTENTE", () => {
    expect(
      suivi6moisStatut(etat({ suivi6moisSentAt: ECHEANCE }), new Date(2026, 7, 1)),
    ).toBe("EN_ATTENTE");
  });

  it("jamais envoyé et avant l'échéance → A_VENIR", () => {
    expect(suivi6moisStatut(etat(), new Date(2026, 6, 14))).toBe("A_VENIR");
  });

  it("jamais envoyé et échéance atteinte (pile J+6) → NON_ENVOYE", () => {
    expect(suivi6moisStatut(etat(), ECHEANCE)).toBe("NON_ENVOYE");
  });

  it("jamais envoyé longtemps après l'échéance (backlog) → NON_ENVOYE", () => {
    expect(suivi6moisStatut(etat(), new Date(2027, 0, 15))).toBe("NON_ENVOYE");
  });
});

describe("suivi6moisAutoEligible (garde anti-vague)", () => {
  it("la fenêtre de grâce par défaut est de 15 jours", () => {
    expect(SUIVI_6MOIS_GRACE_DAYS).toBe(15);
  });

  it("avant l'échéance → non éligible", () => {
    expect(suivi6moisAutoEligible(etat(), new Date(2026, 6, 14))).toBe(false);
  });

  it("pile à l'échéance → éligible", () => {
    expect(suivi6moisAutoEligible(etat(), ECHEANCE)).toBe(true);
  });

  it("dans la fenêtre de grâce (J+6 + 10 j) → éligible", () => {
    expect(suivi6moisAutoEligible(etat(), new Date(2026, 6, 25))).toBe(true);
  });

  it("à la limite exacte de la fenêtre (J+6 + 15 j) → éligible", () => {
    expect(suivi6moisAutoEligible(etat(), new Date(2026, 6, 30))).toBe(true);
  });

  it("au-delà de la fenêtre (J+6 + 16 j) → NON éligible (protège le backlog)", () => {
    expect(suivi6moisAutoEligible(etat(), new Date(2026, 6, 31))).toBe(false);
  });

  it("formation finie il y a longtemps (backlog) → NON éligible", () => {
    expect(suivi6moisAutoEligible(etat(), new Date(2027, 0, 15))).toBe(false);
  });

  it("déjà envoyé → non éligible (le verrou empêche le doublon)", () => {
    expect(suivi6moisAutoEligible(etat({ suivi6moisSentAt: ECHEANCE }), new Date(2026, 6, 20))).toBe(false);
  });

  it("déjà répondu → non éligible", () => {
    expect(
      suivi6moisAutoEligible(etat({ suivi6moisCompletedAt: new Date(2026, 6, 20) }), new Date(2026, 6, 21)),
    ).toBe(false);
  });
});
