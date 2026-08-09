"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getResolvedPlans } from "@/lib/pricing";
import { FORMULE_KEYS, type FormuleKey } from "@/lib/plans";
import { appBaseUrl } from "@/lib/token";

export type BillingState = { error?: string; url?: string };

const NOT_CONFIGURED =
  "Le paiement en ligne n'est pas encore activé. Contactez-nous pour souscrire — nous activons votre compte manuellement.";

const DEMO_BLOCKED =
  "Vous êtes dans un environnement de démonstration : la souscription est désactivée. Contactez-nous pour ouvrir votre compte définitif.";

/** Garde commune : seul le gérant (ADMIN) d'un organisme peut gérer la facturation. */
async function requireAdminOrg() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN" || !session.user.organismeId) {
    return null;
  }
  return { userId: session.user.id, organismeId: session.user.organismeId, email: session.user.email };
}

/**
 * Crée une session Stripe Checkout (abonnement mensuel) pour la formule choisie,
 * au prix ÉDITÉ dans la console (price_data inline → pas de Price à pré-créer).
 * Renvoie l'URL de redirection vers Stripe.
 */
export async function createCheckout(formule: FormuleKey): Promise<BillingState> {
  const ctx = await requireAdminOrg();
  if (!ctx) return { error: "Seul le gérant du compte peut souscrire." };
  if (!FORMULE_KEYS.has(formule)) return { error: "Formule inconnue." };

  const stripe = getStripe();
  if (!stripe) return { error: NOT_CONFIGURED };

  const org = await prisma.organisme.findUnique({ where: { id: ctx.organismeId } });
  if (!org) return { error: "Organisme introuvable." };
  if (org.isDemo) return { error: DEMO_BLOCKED };

  const { plans } = await getResolvedPlans();
  const plan = plans[formule];

  // Client Stripe : réutilise s'il existe, sinon le crée et le mémorise.
  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: org.email ?? ctx.email ?? undefined,
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
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: plan.price * 100,
          recurring: { interval: "month" },
          product_data: { name: `OFManager — formule ${plan.name}` },
        },
      },
    ],
    metadata: { organismeId: org.id, formule },
    subscription_data: { metadata: { organismeId: org.id, formule } },
    allow_promotion_codes: true,
    success_url: `${base}/administration?abonnement=ok`,
    cancel_url: `${base}/administration?abonnement=annule`,
  });

  return { url: checkout.url ?? undefined };
}

/** Ouvre le portail de facturation Stripe (gérer/annuler l'abonnement, factures). */
export async function openBillingPortal(): Promise<BillingState> {
  const ctx = await requireAdminOrg();
  if (!ctx) return { error: "Réservé au gérant du compte." };
  const stripe = getStripe();
  if (!stripe) return { error: NOT_CONFIGURED };

  const org = await prisma.organisme.findUnique({
    where: { id: ctx.organismeId },
    select: { stripeCustomerId: true, isDemo: true },
  });
  if (org?.isDemo) return { error: DEMO_BLOCKED };
  if (!org?.stripeCustomerId) return { error: "Aucun abonnement à gérer pour le moment." };

  const portal = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${appBaseUrl()}/administration`,
  });
  return { url: portal.url };
}

export { isStripeConfigured };
