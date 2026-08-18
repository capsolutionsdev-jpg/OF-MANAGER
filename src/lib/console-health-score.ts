// =============================================================
//  SCORE DE SANTÉ / RISQUE DE CHURN d'un organisme client (console éditeur).
//
//  Fonctions PURES (testées) : on construit des SIGNAUX à partir de données déjà
//  chargées par la fiche (statut, abonnement, usage, activité, support, impayés),
//  puis on les agrège en un score 0-100 + un niveau. Aucun accès base ici.
// =============================================================

export type HealthStatus = "ok" | "warn" | "bad";
export type HealthLevel = "bon" | "surveiller" | "risque";
export type HealthSignal = { key: string; label: string; status: HealthStatus; detail: string };
export type ClientHealth = { score: number; level: HealthLevel; signals: HealthSignal[] };

export type HealthInput = {
  statut: string; // ACTIF / ESSAI / SUSPENDU
  hasSubscription: boolean;
  abonnementActif: boolean; // abonnementJusquau dans le futur
  usageActifCeMois: boolean; // e-mails + inscriptions > 0 ce mois
  joursDepuisActivite: number | null; // null = aucune activité connue
  ticketsOuverts: number;
  facturesImpayees: number; // FactureEditeur EMISE/DEPOSEE non encaissées
};

// Pénalité retranchée à 100 selon la gravité de chaque signal.
const PENALTY: Record<HealthStatus, number> = { ok: 0, warn: 8, bad: 22 };

/** Construit les signaux de santé (PUR). */
export function buildHealthSignals(i: HealthInput): HealthSignal[] {
  const s: HealthSignal[] = [];

  s.push(
    i.statut === "SUSPENDU"
      ? { key: "statut", label: "Statut", status: "bad", detail: "Suspendu" }
      : i.statut === "ESSAI"
        ? { key: "statut", label: "Statut", status: "warn", detail: "En essai (non converti)" }
        : { key: "statut", label: "Statut", status: "ok", detail: "Actif" },
  );

  s.push(
    i.hasSubscription && i.abonnementActif
      ? { key: "abo", label: "Abonnement", status: "ok", detail: "Prélèvement actif" }
      : i.statut === "ESSAI"
        ? { key: "abo", label: "Abonnement", status: "warn", detail: "Pas encore souscrit (essai)" }
        : { key: "abo", label: "Abonnement", status: "bad", detail: "Actif sans abonnement en cours" },
  );

  s.push(
    i.usageActifCeMois
      ? { key: "usage", label: "Usage ce mois", status: "ok", detail: "Compte utilisé" }
      : { key: "usage", label: "Usage ce mois", status: "warn", detail: "Aucun e-mail ni inscription" },
  );

  s.push(
    i.joursDepuisActivite == null
      ? { key: "activite", label: "Dernière activité", status: "bad", detail: "Aucune activité" }
      : i.joursDepuisActivite <= 14
        ? { key: "activite", label: "Dernière activité", status: "ok", detail: `Il y a ${i.joursDepuisActivite} j` }
        : i.joursDepuisActivite <= 45
          ? { key: "activite", label: "Dernière activité", status: "warn", detail: `Il y a ${i.joursDepuisActivite} j` }
          : { key: "activite", label: "Dernière activité", status: "bad", detail: `Il y a ${i.joursDepuisActivite} j` },
  );

  s.push(
    i.ticketsOuverts === 0
      ? { key: "support", label: "Support", status: "ok", detail: "Aucun ticket ouvert" }
      : { key: "support", label: "Support", status: "warn", detail: `${i.ticketsOuverts} ticket(s) ouvert(s)` },
  );

  s.push(
    i.facturesImpayees === 0
      ? { key: "impayes", label: "Factures éditeur", status: "ok", detail: "À jour" }
      : { key: "impayes", label: "Factures éditeur", status: "bad", detail: `${i.facturesImpayees} impayée(s)` },
  );

  return s;
}

/** Agrège des signaux en score 0-100 + niveau (PUR). */
export function computeClientHealth(signals: HealthSignal[]): ClientHealth {
  const total = signals.reduce((sum, sig) => sum + PENALTY[sig.status], 0);
  const score = Math.max(0, Math.min(100, 100 - total));
  const level: HealthLevel = score >= 80 ? "bon" : score >= 55 ? "surveiller" : "risque";
  return { score, level, signals };
}

/** Raccourci : construit les signaux puis calcule le score. */
export function clientHealthFrom(input: HealthInput): ClientHealth {
  return computeClientHealth(buildHealthSignals(input));
}
