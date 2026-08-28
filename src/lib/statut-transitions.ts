import type { FactureEditeurStatut, FactureStatut, SessionStatut } from "@prisma/client";

// Gardes de transition de statut — CONSERVATRICES (A06-011). On n'interdit que
// les retours clairement illégaux (revenir en brouillon après finalisation,
// éditer une session close) ; tout le reste reste permis pour ne pas bloquer une
// correction légitime. Purs → testables et réutilisables côté server actions.

/** Une facture éditeur ne revient en BROUILLON que si elle y est déjà. */
export function canSetFactureEditeurStatut(
  from: FactureEditeurStatut,
  to: FactureEditeurStatut,
): boolean {
  if (to === "BROUILLON") return from === "BROUILLON";
  return true;
}

/** Un devis payé, partiel ou annulé ne peut plus revenir en BROUILLON. */
export function canSetDevisStatut(from: FactureStatut, to: FactureStatut): boolean {
  if (to === "BROUILLON") return from === "BROUILLON" || from === "ENVOYEE";
  return true;
}

/** Une session TERMINEE ou ANNULEE n'est plus éditable. */
export function canEditSession(from: SessionStatut): boolean {
  return from !== "TERMINEE" && from !== "ANNULEE";
}
