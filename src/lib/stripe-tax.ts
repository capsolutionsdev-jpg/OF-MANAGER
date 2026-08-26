import type Stripe from "stripe";

/** Taux de TVA France appliqué à l'abonnement OFManager (assujetti). */
export const TVA_FR_PCT = 20;
const TVA_MARKER = "tva-fr-20";

/**
 * ID du TaxRate Stripe « TVA France 20 % » (EXCLUSIF : s'ajoute au prix HT), résolu
 * de façon IDEMPOTENTE :
 *   1. `STRIPE_TVA_TAX_RATE_ID` si posé (recommandé en prod) ;
 *   2. sinon, réutilise le TaxRate déjà créé par l'app (repéré par `metadata.ofmanager`) ;
 *   3. sinon, le crée une fois.
 * Le TaxRate vit sur le compte Stripe de l'éditeur → un seul pour toute la plateforme.
 */
export async function frTvaTaxRateId(stripe: Stripe): Promise<string> {
  const fromEnv = process.env.STRIPE_TVA_TAX_RATE_ID?.trim();
  if (fromEnv) return fromEnv;

  const existing = await stripe.taxRates.list({ active: true, limit: 100 });
  const found = existing.data.find(
    (t) =>
      t.active &&
      t.percentage === TVA_FR_PCT &&
      t.metadata?.ofmanager === TVA_MARKER,
  );
  if (found) return found.id;

  const created = await stripe.taxRates.create({
    display_name: "TVA",
    description: "TVA France 20 %",
    percentage: TVA_FR_PCT,
    inclusive: false,
    country: "FR",
    metadata: { ofmanager: TVA_MARKER },
  });
  return created.id;
}
