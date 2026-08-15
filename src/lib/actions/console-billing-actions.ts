"use server";

import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { getResolvedPlans } from "@/lib/pricing";
import { planKeyForOrg } from "@/lib/plans";
import { appBaseUrl } from "@/lib/token";

export type ConsoleBillingState = { ok?: boolean; error?: string; url?: string };

/**
 * Génère un lien Stripe Checkout (abonnement mensuel, PRÉLÈVEMENT SEPA) pour un
 * client — à transmettre à son gérant pour qu'il autorise le mandat SEPA et
 * démarre l'abonnement. SUPERADMIN. Dégrade proprement si Stripe non configuré.
 */
export async function createSepaSetupForClient(organismeId: string): Promise<ConsoleBillingState> {
  await requireSuperAdmin();
  const stripe = getStripe();
  if (!stripe) return { error: "Paiement en ligne non activé (STRIPE_SECRET_KEY manquante)." };

  const org = await prisma.organisme.findUnique({ where: { id: organismeId } });
  if (!org) return { error: "Organisme introuvable." };
  if (org.isDemo) return { error: "Impossible pour un organisme de démonstration." };

  const { plans } = await getResolvedPlans();
  const key = planKeyForOrg(org.formule, org.fonctionnalites);
  const plan = plans[key];

  // Client Stripe : réutilise s'il existe, sinon le crée et le mémorise.
  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: org.email ?? undefined,
      name: org.raisonSociale ?? org.nom,
      metadata: { organismeId: org.id },
    });
    customerId = customer.id;
    await prisma.organisme.update({ where: { id: org.id }, data: { stripeCustomerId: customerId } });
  }

  const base = appBaseUrl();
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    payment_method_types: ["sepa_debit"], // mandat de prélèvement SEPA
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: plan.price * 100,
          recurring: { interval: "month" },
          product_data: { name: `OF Manager — formule ${plan.name}` },
        },
      },
    ],
    metadata: { organismeId: org.id, formule: key },
    subscription_data: { metadata: { organismeId: org.id, formule: key } },
    success_url: `${base}/console/${org.id}?sepa=ok`,
    cancel_url: `${base}/console/${org.id}?sepa=annule`,
  });

  return { ok: true, url: checkout.url ?? undefined };
}
