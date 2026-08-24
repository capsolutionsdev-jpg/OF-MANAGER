// Circuits d'automatisation — logique PURE d'ordonnancement (studio visuel).
//
// Une étape se déclenche à une date RELATIVE aux dates de session :
//   dateAncre (début|fin) + offsetJours (négatif = avant, positif = après).
// Ces fonctions ne touchent NI la base NI l'envoi : elles disent seulement
// « quelles étapes sont dues maintenant » (l'exécuteur du Lot 3 s'en sert).
// PUR + testé.

export type CircuitAncre = "DEBUT" | "FIN";
export type CircuitAudience = "APPRENANT" | "ENTREPRISE" | "FORMATEUR";
export type CircuitActionType =
  | "EMAIL"
  | "DOCUMENT"
  | "ESIGN"
  | "EVALUATION"
  | "SATISFACTION"
  | "AUTO_EVALUATION";

/** Attributs minimaux d'une étape pour l'ordonnancement. */
export type StepLike = {
  id: string;
  ancre: CircuitAncre;
  offsetJours: number;
  audience: CircuitAudience;
  typeAction: CircuitActionType;
};

export type SessionDates = { dateDebut: Date; dateFin: Date };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Date de déclenchement d'une étape pour une session donnée — PUR. */
export function stepFireDate(step: Pick<StepLike, "ancre" | "offsetJours">, dates: SessionDates): Date {
  const ancre = step.ancre === "FIN" ? dates.dateFin : dates.dateDebut;
  return new Date(ancre.getTime() + step.offsetJours * DAY_MS);
}

/** L'étape est-elle due à l'instant `now` (déclenchement atteint) ? — PUR. */
export function stepIsDue(
  step: Pick<StepLike, "ancre" | "offsetJours">,
  dates: SessionDates,
  now: Date,
): boolean {
  return now.getTime() >= stepFireDate(step, dates).getTime();
}

/**
 * Étapes DUES et pas encore exécutées (l'idempotence est portée par
 * `firedStepIds` = ids déjà journalisés dans CircuitStepRun) — PUR.
 */
export function dueSteps<T extends StepLike>(
  steps: T[],
  dates: SessionDates,
  now: Date,
  firedStepIds: ReadonlySet<string>,
): T[] {
  return steps.filter((s) => !firedStepIds.has(s.id) && stepIsDue(s, dates, now));
}

// ── Libellés d'affichage (UI timeline) ───────────────────────────────────────

export const ACTION_LABELS: Record<CircuitActionType, string> = {
  EMAIL: "Email",
  DOCUMENT: "Document",
  ESIGN: "E-Sign Doc",
  EVALUATION: "Évaluation",
  SATISFACTION: "Satisfaction",
  AUTO_EVALUATION: "Auto-Éval",
};

export const AUDIENCE_LABELS: Record<CircuitAudience, string> = {
  APPRENANT: "Apprenants",
  ENTREPRISE: "Entreprises",
  FORMATEUR: "Formateurs",
};

export const ANCRE_LABELS: Record<CircuitAncre, string> = {
  DEBUT: "début",
  FIN: "fin",
};

/** Libellé lisible du moment d'une étape : « 15 jours avant début », « Jour Fin »… */
export function describeOffset(step: Pick<StepLike, "ancre" | "offsetJours">): string {
  const ancre = ANCRE_LABELS[step.ancre];
  const n = step.offsetJours;
  if (n === 0) return `Jour ${step.ancre === "FIN" ? "Fin" : "Début"}`;
  const abs = Math.abs(n);
  const jour = abs > 1 ? "jours" : "jour";
  return n < 0 ? `${abs} ${jour} avant ${ancre}` : `${abs} ${jour} après ${ancre}`;
}

/** Colonnes de timeline distinctes présentes dans un circuit, triées chronologiquement. */
export function timelineColumns(steps: StepLike[]): { key: string; label: string; rank: number }[] {
  const map = new Map<string, { key: string; label: string; rank: number }>();
  for (const s of steps) {
    // rang chronologique : début = 0 + offset ; fin = grand décalage + offset
    // (garantit fin après début sans connaître la durée réelle).
    const rank = (s.ancre === "FIN" ? 100000 : 0) + s.offsetJours;
    const key = `${s.ancre}:${s.offsetJours}`;
    if (!map.has(key)) map.set(key, { key, label: describeOffset(s), rank });
  }
  return [...map.values()].sort((a, b) => a.rank - b.rank);
}
