// Helpers partagés du suivi comptable (page serveur + composants clients).
// Aucun de ces helpers ne modifie un calcul : formatage + libellés d'état.

/** Format monétaire FR (sépare les milliers, 0–2 décimales). */
export const euro = (n: number) =>
  n.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }) + " €";

export const MOIS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const;

export type Etat = "PAYE" | "PARTIEL" | "IMPAYE" | "A_CHIFFRER";

export const ETATS: Record<Etat, { label: string; cls: string }> = {
  PAYE: { label: "Payé", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  PARTIEL: { label: "Partiel", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  IMPAYE: { label: "Impayé", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  A_CHIFFRER: { label: "À chiffrer", cls: "bg-muted text-muted-foreground" },
};
