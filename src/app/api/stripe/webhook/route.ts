import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { OrganismeStatut, FormuleAbonnement } from "@prisma/client";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { FORMULE_KEYS } from "@/lib/plans";
import { fulfillCivicCheckout } from "@/lib/civique-api";
import { organismeStatutForSubscription } from "@/lib/billing/subscription-status";
import { sendEmail } from "@/lib/email";
import { reportError } from "@/lib/observability/report-error";

export const runtime = "nodejs";
// Webhook Stripe : corps brut requis pour vérifier la signature.
export const dynamic = "force-dynamic";

/** Met à jour l'organisme par son id (métadonnées) ou, à défaut, par son customer Stripe. */
async function updateOrg(
  organismeId: string | null | undefined,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
  data: Parameters<typeof prisma.organisme.updateMany>[0]["data"],
) {
  if (organismeId) {
    await prisma.organisme.updateMany({ where: { id: organismeId }, data });
    return;
  }
  const customerId = typeof customer === "string" ? customer : customer?.id;
  if (customerId) {
    await prisma.organisme.updateMany({ where: { stripeCustomerId: customerId }, data });
  }
}

function readPeriodEnd(sub: Stripe.Subscription): Date | undefined {
  // Selon la version d'API, current_period_end est au niveau racine ou des items.
  const root = (sub as unknown as { current_period_end?: number }).current_period_end;
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  const ts = root ?? item?.current_period_end;
  return ts ? new Date(ts * 1000) : undefined;
}

function readFormule(meta: Stripe.Metadata | null | undefined): FormuleAbonnement | undefined {
  const f = meta?.formule;
  return f && FORMULE_KEYS.has(f) ? (f as FormuleAbonnement) : undefined;
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe non configuré." }, { status: 503 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Signature manquante." }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, secret);
  } catch (e) {
    console.error("[stripe webhook] signature invalide:", e);
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  try {
    // Idempotence (BCK-05) : signature vérifiée ci-dessus + handlers idempotents
    // par construction (updateMany posant des valeurs ABSOLUES — statut, ids,
    // formule, date de fin — sans compteur ni insertion). Un rejeu Stripe du même
    // event ré-applique les mêmes valeurs → aucun effet de bord. (Si un handler à
    // effet incrémental est ajouté un jour, dédupliquer alors sur event.id.)
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        // Paiement d'une prépa civique en ligne (site vitrine) : création du
        // compte candidat + provision de l'accès + enregistrement du paiement.
        if (s.metadata?.type === "civique") {
          await fulfillCivicCheckout({
            sessionId: s.id,
            amountTotal: s.amount_total,
            metadata: s.metadata,
          });
          break;
        }
        await updateOrg(s.metadata?.organismeId, s.customer, {
          statut: OrganismeStatut.ACTIF,
          stripeSubscriptionId: typeof s.subscription === "string" ? s.subscription : undefined,
          stripeCustomerId: typeof s.customer === "string" ? s.customer : undefined,
          formule: readFormule(s.metadata),
        });
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        // Dunning : `past_due` = période de grâce → on reste ACTIF (pas de
        // suspension brutale) ; suspension seulement à l'échec définitif. Statut
        // indéfini (incomplete/paused) → on ne touche pas à l'état courant.
        const statut = organismeStatutForSubscription(sub.status);
        await updateOrg(sub.metadata?.organismeId, sub.customer, {
          ...(statut ? { statut } : {}),
          stripeSubscriptionId: sub.id,
          abonnementJusquau: readPeriodEnd(sub),
          formule: readFormule(sub.metadata),
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await updateOrg(sub.metadata?.organismeId, sub.customer, {
          statut: OrganismeStatut.SUSPENDU,
        });
        break;
      }
      case "invoice.payment_failed": {
        // Paiement échoué : NE PAS suspendre — Stripe relance automatiquement
        // (Smart Retries) pendant la période de relance ; l'organisme reste actif
        // en période de grâce. La suspension n'intervient qu'à l'échec définitif
        // (subscription unpaid/canceled ci-dessus). On journalise pour l'alerting.
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        console.error("[stripe webhook] paiement échoué — dunning en cours", {
          invoice: inv.id,
          customer: customerId,
          tentative: inv.attempt_count,
          prochaineTentative: inv.next_payment_attempt
            ? new Date(inv.next_payment_attempt * 1000).toISOString()
            : null,
        });
        // Relance dunning : prévenir le gérant de l'organisme (best-effort).
        try {
          const org = customerId
            ? await prisma.organisme.findFirst({
                where: { stripeCustomerId: customerId },
                select: { email: true },
              })
            : null;
          if (org?.email) {
            const prochaine = inv.next_payment_attempt
              ? ` Un nouvel essai automatique aura lieu le ${new Date(inv.next_payment_attempt * 1000).toLocaleDateString("fr-FR")}.`
              : "";
            await sendEmail({
              to: org.email,
              subject: "Paiement de votre abonnement OFManager en échec",
              body:
                `Bonjour,\n\nLe paiement de votre abonnement OFManager n'a pas abouti (tentative ${inv.attempt_count}).${prochaine}\n\n` +
                `Merci de vérifier votre moyen de paiement (carte ou mandat SEPA) pour éviter toute interruption de service.\n\nL'équipe OFManager`,
            });
          }
        } catch (e) {
          console.error("[stripe webhook] relance dunning e-mail échouée (ignorée)", e);
          await reportError(e, { tag: "stripe:dunning-email" });
        }
        break;
      }
      case "invoice.paid": {
        // Recouvrement : un paiement (initial ou après relance) a réussi →
        // l'organisme est/redevient ACTIF (sort de la période de grâce).
        const inv = event.data.object as Stripe.Invoice;
        await updateOrg(undefined, inv.customer, { statut: OrganismeStatut.ACTIF });
        break;
      }
    }
  } catch (e) {
    console.error("[stripe webhook] traitement échoué:", e);
    await reportError(e, { tag: "stripe:webhook", extra: { type: event.type } });
    // 500 → Stripe RÉ-ESSAIE automatiquement (relances avec backoff sur ~72 h).
    // Auparavant on renvoyait 200, ce qui « acquittait » un événement échoué :
    // une erreur transitoire (base indisponible…) faisait perdre DÉFINITIVEMENT
    // l'événement — ex. l'activation d'un organisme après un paiement encaissé
    // (constat d'audit §7). Les handlers étant idempotents, le rejeu est sûr.
    return NextResponse.json({ received: false, error: "traitement échoué" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
