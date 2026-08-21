// Pipeline de prospection éditeur — 8 étapes (plan de lancement, feuille 6).
//
// Les clés correspondent aux valeurs de l'enum Prisma `LeadStatut` (après
// migration 5→8 étapes). `tauxCible` = taux de passage attendu à cette étape
// (repère de pilotage, feuille 6). `PERDU` reste une issue transverse (hors flux).

export type StageKey =
  | "FICHIER"
  | "CONTACTE"
  | "ENGAGE"
  | "QUALIFIE"
  | "DEMO_PLANIFIEE"
  | "DEMO_REALISEE"
  | "PROPOSITION"
  | "SIGNE";

export type PipelineStage = { key: StageKey; label: string; tauxCible: number; hint: string };

export const PIPELINE_STAGES: PipelineStage[] = [
  { key: "FICHIER", label: "Fichier", tauxCible: 100, hint: "Importé, dédoublonné, e-mail vérifié, verticale identifiée" },
  { key: "CONTACTE", label: "Contacté", tauxCible: 95, hint: "E-mail 1 délivré — suivre ouvertures/clics" },
  { key: "ENGAGE", label: "Engagé", tauxCible: 15, hint: "Ouvert 2×, cliqué ou répondu — appeler sous 48 h" },
  { key: "QUALIFIE", label: "Qualifié", tauxCible: 45, hint: "Outil, volume, échéance Qualiopi, décideur connus" },
  { key: "DEMO_PLANIFIEE", label: "Démo planifiée", tauxCible: 75, hint: "Créneau confirmé + catalogue reçu" },
  { key: "DEMO_REALISEE", label: "Démo réalisée", tauxCible: 85, hint: "Rendez-vous tenu — proposition sous 24 h" },
  { key: "PROPOSITION", label: "Proposition", tauxCible: 70, hint: "Devis envoyé — relance J+3, J+7, J+14" },
  { key: "SIGNE", label: "Signé", tauxCible: 35, hint: "Devis signé + mandat SEPA actif — onboarding sous 5 j" },
];

export const LEAD_PERDU = "PERDU" as const;

/** Toutes les valeurs valides de statut (8 étapes + perdu). */
export const LEAD_STATUTS: string[] = [...PIPELINE_STAGES.map((s) => s.key), LEAD_PERDU];

export const PIPELINE_ORDER: StageKey[] = PIPELINE_STAGES.map((s) => s.key);

const STAGE_BY_KEY = new Map(PIPELINE_STAGES.map((s) => [s.key, s]));

export function stageLabel(key: string): string {
  return STAGE_BY_KEY.get(key as StageKey)?.label ?? (key === LEAD_PERDU ? "Perdu" : key);
}

/** Index d'une étape dans le flux (−1 si PERDU/inconnu) — PUR. */
export function stageIndex(key: string): number {
  return PIPELINE_ORDER.indexOf(key as StageKey);
}

/** Étape suivante / précédente dans le flux (null aux bornes) — PUR. */
export function nextStage(key: string): StageKey | null {
  const i = stageIndex(key);
  return i >= 0 && i < PIPELINE_ORDER.length - 1 ? PIPELINE_ORDER[i + 1] : null;
}
export function prevStage(key: string): StageKey | null {
  const i = stageIndex(key);
  return i > 0 ? PIPELINE_ORDER[i - 1] : null;
}
