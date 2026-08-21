"use server";

import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { getResolvedPlans } from "@/lib/pricing";
import { planKeyForOrg } from "@/lib/plans";
import { computeContratTotals } from "@/lib/contrats/prestation";
import { contratDataFrom } from "@/lib/contrats/prestation-data";
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

  // Base de facturation : le dernier contrat de prestation SIGNÉ (montant net +
  // options + packs, périodicité de son engagement — l'offre Pionniers y est déjà
  // cuite) ; sinon repli sur le prix du palier.
  const contrat = await prisma.contratPrestation.findFirst({
    where: { organismeId, statut: "SIGNE" },
    orderBy: { createdAt: "desc" },
  });
  const { plans } = await getResolvedPlans();
  const key = planKeyForOrg(org.formule, org.fonctionnalites);
  const plan = plans[key];

  let interval: "month" | "year" = "month";
  let unitAmount = plan.price * 100;
  let libelle = `OF Manager — formule ${plan.name}`;
  if (contrat) {
    const data = contratDataFrom(contrat);
    const t = computeContratTotals(data);
    const annuel = data.engagement === "ANNUEL";
    interval = annuel ? "year" : "month";
    unitAmount = Math.round(t.recurrentMois * (annuel ? 12 : 1) * 100);
    libelle = `OF Manager — ${data.formuleNom} (contrat ${contrat.reference})`;
  }

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
          unit_amount: unitAmount,
          recurring: { interval },
          product_data: { name: libelle },
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
