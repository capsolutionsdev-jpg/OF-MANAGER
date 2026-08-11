import { Role } from "@prisma/client";

/**
 * Postes d'un organisme de formation (#4). Chaque poste est purement descriptif
 * (stocké dans `User.fonction`) et rattaché à un NIVEAU d'accès porté par le
 * `role` (ASSISTANT ou RESPONSABLE_FORMATION). L'enum `Role` reste inchangé :
 * l'admin affine ensuite les sections accessibles via les cases à cocher.
 */
export type Poste = {
  value: string;
  label: string;
  niveau: "ASSISTANT" | "RESPONSABLE_FORMATION";
};

export const POSTES: Poste[] = [
  // Niveau ASSISTANT (accès de base)
  { value: "assistant-administratif", label: "Assistant administratif", niveau: "ASSISTANT" },
  { value: "secretaire", label: "Secrétaire", niveau: "ASSISTANT" },
  { value: "accueil", label: "Chargé(e) d'accueil", niveau: "ASSISTANT" },
  { value: "commercial", label: "Commercial(e)", niveau: "ASSISTANT" },
  { value: "conseiller-formation", label: "Conseiller(ère) en formation", niveau: "ASSISTANT" },
  // Niveau RESPONSABLE (accès étendu : compta, qualité, formations…)
  { value: "comptable", label: "Comptable / Gestion", niveau: "RESPONSABLE_FORMATION" },
  { value: "referent-handicap", label: "Référent(e) handicap", niveau: "RESPONSABLE_FORMATION" },
  { value: "coordinateur-pedagogique", label: "Coordinateur(rice) pédagogique", niveau: "RESPONSABLE_FORMATION" },
  { value: "responsable-formation", label: "Responsable de formation", niveau: "RESPONSABLE_FORMATION" },
  { value: "responsable-qualite", label: "Responsable qualité (Qualiopi)", niveau: "RESPONSABLE_FORMATION" },
  { value: "directeur-adjoint", label: "Directeur(rice) adjoint(e)", niveau: "RESPONSABLE_FORMATION" },
  // Repli
  { value: "autre", label: "Autre", niveau: "ASSISTANT" },
];

const byValue = new Map(POSTES.map((p) => [p.value, p]));
const byLabel = new Map(POSTES.map((p) => [p.label, p]));

/** Niveau de permission (rôle) associé à un poste. */
export function niveauForPoste(value: string): Role {
  return byValue.get(value)?.niveau === "RESPONSABLE_FORMATION"
    ? Role.RESPONSABLE_FORMATION
    : Role.ASSISTANT;
}

/** Libellé d'un poste, pour stockage dans `User.fonction`. */
export function labelForPoste(value: string): string {
  return byValue.get(value)?.label ?? "";
}

/**
 * Retrouve la clé de poste depuis une `fonction` stockée, sinon un repli basé
 * sur le rôle (pour les comptes créés avant l'ajout des postes).
 */
export function posteValueFromFonction(
  fonction: string | null | undefined,
  role?: string,
): string {
  if (fonction && byLabel.has(fonction)) return byLabel.get(fonction)!.value;
  return role === "RESPONSABLE_FORMATION" ? "responsable-formation" : "assistant-administratif";
}
