import "server-only";
import Stripe from "stripe";

// Client Stripe paresseux. Tant que STRIPE_SECRET_KEY n'est pas défini, le
// paiement en ligne est « non activé » : les actions/webhook dégradent
// proprement au lieu d'échouer (le 14 jours d'essai + contact commercial
// restent le parcours par défaut).
let client: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (client !== undefined) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  // apiVersion non épinglée : on suit la version du compte (évite les
  // désalignements de types avec le SDK installé).
  client = key ? new Stripe(key) : null;
  return client;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
