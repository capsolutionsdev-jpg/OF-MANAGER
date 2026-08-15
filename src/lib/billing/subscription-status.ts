import { OrganismeStatut } from "@prisma/client";

/**
 * Machine à états : statut d'organisme déduit du statut d'abonnement Stripe.
 *
 * Point clé du DUNNING (relance d'impayé) : un abonnement `past_due` (paiement
 * échoué, relances Stripe en cours) NE DOIT PAS suspendre immédiatement
 * l'organisme — on lui laisse une période de grâce le temps que Stripe réessaie.
 * La suspension n'intervient qu'à l'échec DÉFINITIF (`unpaid`/`canceled`/
 * `incomplete_expired`).
 *
 * Renvoie `undefined` quand le statut ne doit pas changer (états transitoires
 * `incomplete`/`paused`), pour ne pas écraser l'état courant de l'organisme.
 *
 * Statuts Stripe : https://stripe.com/docs/api/subscriptions/object#subscription_object-status
 */
export function organismeStatutForSubscription(
  status: string,
): OrganismeStatut | undefined {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due": // période de grâce (dunning) — on reste actif
      return OrganismeStatut.ACTIF;
    case "unpaid":
    case "canceled":
    case "incomplete_expired":
      return OrganismeStatut.SUSPENDU;
    default: // incomplete, paused, autres → ne pas toucher au statut
      return undefined;
  }
}
