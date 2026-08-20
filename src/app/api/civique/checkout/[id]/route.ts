import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { civicCors, fulfillCivicCheckout } from "@/lib/civique-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VITRINE_BASE = process.env.VITRINE_URL ?? "https://ofmanager.info";

// GET /api/civique/checkout/:id — appelé par la page de succès du vitrine.
// Vérifie le paiement auprès de Stripe puis exécute le fulfillment (idempotent)
// et renvoie le code d'accès du candidat. Évite de dépendre du timing du webhook.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Paiement non configuré." }, { status: 503, headers: civicCors });
  }

  const session = await stripe.checkout.sessions.retrieve(id).catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Session introuvable." }, { status: 404, headers: civicCors });
  }
  if (session.payment_status !== "paid") {
    return NextResponse.json({ paid: false }, { headers: civicCors });
  }

  const res = await fulfillCivicCheckout({
    sessionId: session.id,
    amountTotal: session.amount_total,
    metadata: session.metadata,
  });
  if (!res) {
    return NextResponse.json({ error: "Session non civique." }, { status: 400, headers: civicCors });
  }

  return NextResponse.json(
    {
      paid: true,
      prenom: res.prenom,
      email: res.email,
      civicToken: res.civicToken,
      loginUrl: `${VITRINE_BASE}/cap-language-academy/examen-civique/connexion`,
    },
    { headers: civicCors },
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: civicCors });
}
