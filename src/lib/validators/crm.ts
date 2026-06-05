import { CrmStage, InteractionType } from "@prisma/client";

/** Étapes du pipeline commercial (ordre d'affichage du Kanban). */
export const CRM_STAGE_ORDER: CrmStage[] = [
  "NOUVEAU",
  "QUALIFIE",
  "PROPOSITION",
  "NEGOCIATION",
  "GAGNE",
  "PERDU",
];

export const CRM_STAGE_LABELS: Record<CrmStage, string> = {
  NOUVEAU: "Nouveau",
  QUALIFIE: "Qualifié",
  PROPOSITION: "Proposition",
  NEGOCIATION: "Négociation",
  GAGNE: "Gagné",
  PERDU: "Perdu",
};

/** Couleur d'accent par étape (bord supérieur de colonne / badge). */
export const CRM_STAGE_ACCENT: Record<CrmStage, string> = {
  NOUVEAU: "border-t-blue-400",
  QUALIFIE: "border-t-sky-400",
  PROPOSITION: "border-t-violet-400",
  NEGOCIATION: "border-t-amber-400",
  GAGNE: "border-t-emerald-500",
  PERDU: "border-t-red-400",
};

export const INTERACTION_LABELS: Record<InteractionType, string> = {
  APPEL: "Appel",
  EMAIL: "E-mail",
  RDV: "Rendez-vous",
  NOTE: "Note",
};
