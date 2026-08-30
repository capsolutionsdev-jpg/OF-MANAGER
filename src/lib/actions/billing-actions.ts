"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getResolvedPlans } from "@/lib/pricing";
import { FORMULE_KEYS, type FormuleKey } from "@/lib/plans";
import { frTvaTaxRateId } from "@/lib/stripe-tax";
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
export async function createCheckout(
  formule: FormuleKey,
  periode: "mensuel" | "annuel" = "mensuel",
  acceptedTerms = false,
): Promise<BillingState> {
  const ctx = await requireAdminOrg();
  if (!ctx) return { error: "Seul le gérant du compte peut souscrire." };
  if (!FORMULE_KEYS.has(formule)) return { error: "Formule inconnue." };
  // Cadre contractuel opposable : pas de souscription sans acceptation explicite
  // des CGV + politique de confidentialité (case cochée côté client, revérifiée ici).
  if (!acceptedTerms) {
    return { error: "Vous devez accepter les CGV et la politique de confidentialité pour souscrire." };
  }

  const stripe = getStripe();
  if (!stripe) return { error: NOT_CONFIGURED };

  const org = await prisma.organisme.findUnique({ where: { id: ctx.organismeId } });
  if (!org) return { error: "Organisme introuvable." };
  if (org.isDemo) return { error: DEMO_BLOCKED };

  // Résolution + validation de la formule/période AVANT toute écriture : on ne trace
  // une acceptation que si la souscription demandée est réellement ouvrable (sinon
  // « RESEAU » en annuel, priceYear null, laisserait une acceptation fantôme en base).
  const { plans } = await getResolvedPlans();
  const plan = plans[formule];
  const annuel = periode === "annuel";
  if (annuel && plan.priceYear == null) {
    return { error: "Facturation annuelle indisponible pour cette formule (sur devis)." };
  }
  const unitAmount = (annuel ? (plan.priceYear as number) : plan.price) * 100;
  const interval: "month" | "year" = annuel ? "year" : "month";

  // Trace l'acceptation contractuelle au moment du clic — les deux documents publiés
  // et liés dans la case (CGV + politique de confidentialité) sont acceptés d'un même
  // geste. Horodatage sur l'organisme + journal d'audit nominatif (qui a engagé l'OF).
  const acceptedAt = new Date();
  await prisma.organisme.update({
    where: { id: org.id },
    data: { cgvAcceptedAt: acceptedAt, confidentialiteAcceptedAt: acceptedAt },
  });
  // Journal best-effort : ne jamais bloquer une souscription légitime sur un incident
  // de journalisation (la preuve d'acceptation reste l'horodatage écrit ci-dessus).
  try {
    await prisma.auditLog.create({
      data: {
        organismeId: org.id,
        userId: ctx.userId,
        action: "ACCEPT_CGV",
        entityType: "Organisme",
        entityId: org.id,
        changesJson: { formule, periode, cgv: true, confidentialite: true },
      },
    });
  } catch {
    // silencieux : l'acceptation est déjà tracée sur l'organisme.
  }

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
  // TVA 20 % (assujetti) : TaxRate exclusif ajouté au prix HT → la facture Stripe
  // ventile HT + TVA (PC-FACT-06). Les prix des formules restent définis HT.
  const tvaRateId = await frTvaTaxRateId(stripe);
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        quantity: 1,
        tax_rates: [tvaRateId],
        price_data: {
          currency: "eur",
          unit_amount: unitAmount,
          recurring: { interval },
          product_data: { name: `OFManager — formule ${plan.name}${annuel ? " (annuel −15 %)" : ""}` },
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
