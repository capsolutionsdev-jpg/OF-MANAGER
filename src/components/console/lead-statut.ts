// Libellés + couleurs des statuts de prospect (pipeline 8 étapes + Perdu),
// partagés par le Kanban, la table, la fiche et le sélecteur. Client-safe.

import { PIPELINE_STAGES, LEAD_PERDU, stageLabel } from "@/lib/growth/pipeline";
import { TONE_CLASSES } from "@/components/ui/status-badge";

export const STATUT_OPTIONS: { key: string; label: string }[] = [
  ...PIPELINE_STAGES.map((s) => ({ key: s.key as string, label: s.label })),
  { key: LEAD_PERDU, label: "Perdu" },
];

const TONE: Record<string, string> = {
  FICHIER: TONE_CLASSES.neutral,
  CONTACTE: TONE_CLASSES.info,
  ENGAGE: TONE_CLASSES.info,
  QUALIFIE: TONE_CLASSES.info,
  DEMO_PLANIFIEE: TONE_CLASSES.warning,
  DEMO_REALISEE: TONE_CLASSES.warning,
  PROPOSITION: TONE_CLASSES.warning,
  SIGNE: TONE_CLASSES.success,
  PERDU: TONE_CLASSES.neutral,
};

export const statutTone = (key: string): string => TONE[key] ?? TONE_CLASSES.neutral;
export const statutLabel = (key: string): string => stageLabel(key);

/** Étapes considérées « à traiter » (avant qualification). */
export const STATUTS_A_TRAITER = ["FICHIER", "CONTACTE", "ENGAGE"];
