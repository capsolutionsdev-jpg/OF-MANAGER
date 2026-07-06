/**
 * Types du moteur de validation de session (Qualiopi).
 * Purs et sérialisables — aucun accès base ni fonction dans l'état retourné,
 * afin de pouvoir traverser la frontière serveur → composant client.
 */

export type ItemStatus =
  | "VALIDATED_AUTO" // document signé électroniquement / complété automatiquement
  | "VALIDATED_MANUAL" // confirmé par un collaborateur après vérification physique
  | "PENDING" // le document existe mais n'est pas encore validé
  | "MISSING"; // document manquant / non produit / non reçu

export type SectionKey = "SESSION" | "CANDIDATE" | "TRAINER";

/** Marque de validation manuelle (traçabilité : qui, quand, commentaire). */
export interface ManualMark {
  nom: string;
  userId?: string;
  date: string; // ISO
  comment?: string;
}

/** Item de validation calculé (sérialisable). */
export interface ValidationItem {
  key: string; // clé stable de l'item (config)
  label: string;
  status: ItemStatus;
  href?: string; // accès direct au document (ou à l'écran pour le produire)
  by?: string; // validateur (si manuel)
  at?: string; // ISO (si validé)
  comment?: string;
  canManual: boolean; // un bouton de validation manuelle est-il proposé ?
  inscriptionId?: string; // renseigné pour les items candidat
  pieceLabel?: string; // renseigné pour un item « pièce du dossier »
}

export interface SectionState {
  key: SectionKey;
  label: string;
  items: ValidationItem[];
  validated: number;
  total: number;
}

export interface CandidateState {
  inscriptionId: string;
  candidatId: string;
  name: string;
  items: ValidationItem[];
  validated: number;
  total: number;
  compliant: boolean;
}

/** État global de validation d'une session (sérialisable, calculé par le moteur). */
export interface ValidationState {
  sessionId: string;
  session: SectionState;
  trainer: SectionState;
  candidates: CandidateState[];
  candidatesCompliant: number;
  candidatesTotal: number;
  totalItems: number;
  validatedItems: number;
  percentage: number; // 0–100 arrondi
  isValidated: boolean;
  isArchived: boolean;
}

export const STATUS_LABELS: Record<ItemStatus, string> = {
  VALIDATED_AUTO: "Validé (automatique)",
  VALIDATED_MANUAL: "Validé (manuel)",
  PENDING: "En attente",
  MISSING: "Manquant",
};

export function isValidated(status: ItemStatus): boolean {
  return status === "VALIDATED_AUTO" || status === "VALIDATED_MANUAL";
}
