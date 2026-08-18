import { describe, it, expect } from "vitest";
import {
  buildHealthSignals,
  computeClientHealth,
  clientHealthFrom,
  type HealthInput,
} from "@/lib/console-health-score";

const healthy: HealthInput = {
  statut: "ACTIF",
  hasSubscription: true,
  abonnementActif: true,
  usageActifCeMois: true,
  joursDepuisActivite: 3,
  ticketsOuverts: 0,
  facturesImpayees: 0,
};

describe("console — score de santé / churn", () => {
  it("client sain → 100 / bon (tous les signaux ok)", () => {
    const h = clientHealthFrom(healthy);
    expect(h.score).toBe(100);
    expect(h.level).toBe("bon");
    expect(h.signals.every((s) => s.status === "ok")).toBe(true);
  });

  it("suspendu + impayés + inactif → risque, score < 55", () => {
    const h = clientHealthFrom({
      statut: "SUSPENDU",
      hasSubscription: false,
      abonnementActif: false,
      usageActifCeMois: false,
      joursDepuisActivite: 120,
      ticketsOuverts: 2,
      facturesImpayees: 3,
    });
    expect(h.level).toBe("risque");
    expect(h.score).toBeLessThan(55);
  });

  it("essai sans abonnement mais actif = 84 / bon (essai toléré)", () => {
    const h = clientHealthFrom({
      statut: "ESSAI",
      hasSubscription: false,
      abonnementActif: false,
      usageActifCeMois: true,
      joursDepuisActivite: 5,
      ticketsOuverts: 0,
      facturesImpayees: 0,
    });
    expect(h.score).toBe(84); // 2 signaux warn (statut + abo) = -16
    expect(h.level).toBe("bon");
  });

  it("score borné à [0, 100]", () => {
    const h = computeClientHealth(
      buildHealthSignals({
        statut: "SUSPENDU",
        hasSubscription: false,
        abonnementActif: false,
        usageActifCeMois: false,
        joursDepuisActivite: null,
        ticketsOuverts: 5,
        facturesImpayees: 9,
      }),
    );
    expect(h.score).toBeGreaterThanOrEqual(0);
    expect(h.score).toBeLessThanOrEqual(100);
  });

  it("une facture impayée = signal `bad`", () => {
    const h = clientHealthFrom({ ...healthy, facturesImpayees: 1 });
    expect(h.signals.find((s) => s.key === "impayes")?.status).toBe("bad");
  });

  it("activité inconnue = signal `bad`", () => {
    const h = clientHealthFrom({ ...healthy, joursDepuisActivite: null });
    expect(h.signals.find((s) => s.key === "activite")?.status).toBe("bad");
  });
});
