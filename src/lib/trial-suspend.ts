import "server-only";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { reportError } from "@/lib/observability/report-error";
import { TRIAL_DAYS } from "@/lib/trial";

// Un abonnement Stripe dans un de ces états = client réel (à ne PAS suspendre).
// `past_due` = période de grâce (dunning) : le client reste actif.
const ACTIVE_SUB_STATUS = new Set(["active", "trialing", "past_due"]);

/**
 * Passe en SUSPENDU les organismes encore en ESSAI dont la période est dépassée —
 * SAUF ceux qui ont un abonnement Stripe actif (A12-005).
 *
 * Sans réconciliation, un webhook Stripe d'activation perdu laissait un client
 * PAYANT en ESSAI, et ce cron le suspendait. On vérifie donc Stripe avant de
 * suspendre : abonnement actif → on réconcilie en ACTIF ; incertitude Stripe →
 * on s'abstient (ne jamais couper un client par erreur).
 */
export async function suspendExpiredTrials(): Promise<{ suspended: number; reconciled: number }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - TRIAL_DAYS);

  const expired = await prisma.organisme.findMany({
    where: { statut: "ESSAI", createdAt: { lt: cutoff } },
    select: { id: true, stripeCustomerId: true },
  });

  const stripe = getStripe();
  let suspended = 0;
  let reconciled = 0;

  for (const org of expired) {
    if (stripe && org.stripeCustomerId) {
      try {
        const subs = await stripe.subscriptions.list({
          customer: org.stripeCustomerId,
          status: "all",
          limit: 5,
        });
        if (subs.data.some((s) => ACTIVE_SUB_STATUS.has(s.status))) {
          await prisma.organisme.update({ where: { id: org.id }, data: { statut: "ACTIF" } });
          reconciled++;
          continue;
        }
      } catch (e) {
        await reportError(e, { tag: "cron:suspend-trials:reconcile", extra: { orgId: org.id } });
        continue; // incertitude Stripe → ne pas suspendre
      }
    }
    await prisma.organisme.update({ where: { id: org.id }, data: { statut: "SUSPENDU" } });
    suspended++;
  }

  return { suspended, reconciled };
}
