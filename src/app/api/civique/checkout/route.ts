import { NextResponse } from "next/server";
import { CivicMention } from "@prisma/client";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { civicCors } from "@/lib/civique-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VITRINE_BASE = process.env.VITRINE_URL ?? "https://ofmanager.fr";

const MENTION_TO_DB: Record<string, CivicMention> = {
  csp: CivicMention.CSP,
  cr: CivicMention.CR,
  naturalisation: CivicMention.NATURALISATION,
};
const MENTION_NOM: Record<CivicMention, string> = {
  CSP: "Carte de séjour pluriannuelle (CSP)",
  CR: "Carte de résident (CR)",
  NATURALISATION: "Naturalisation",
};
// Tarifs provisoires de repli (centimes) si aucun CivicTarif n'est défini.
// L'admin peut les surcharger via la table CivicTarif (éditable en back-office).
const PRIX_DEFAUT: Record<CivicMention, number> = {
  CSP: 14900,
  CR: 17900,
  NATURALISATION: 19900,
};

// POST /api/civique/checkout — crée une session Stripe Checkout pour la prépa
// civique en ligne. Appelé par le site vitrine. Public (CORS), aucune donnée
// sensible ; le compte candidat est créé à la confirmation du paiement (webhook).
export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Paiement non configuré." }, { status: 503, headers: civicCors });
  }

  let body: {
    mention?: string;
    prenom?: string;
    email?: string;
    organismeId?: string;
    consentRetractation?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400, headers: civicCors });
  }

  const mention = MENTION_TO_DB[(body.mention ?? "").toLowerCase()];
  const email = (body.email ?? "").trim().toLowerCase();
  const prenom = (body.prenom ?? "").trim();
  if (!mention) return NextResponse.json({ error: "Mention inconnue." }, { status: 400, headers: civicCors });
  if (!email.includes("@")) return NextResponse.json({ error: "E-mail invalide." }, { status: 400, headers: civicCors });

  // Correctif audit P3 : organisme cible = env CIVIC_ORGANISME_ID (ou corps pour
  // le multi-vitrine) — plus d'auto-détection de « l'organisme le plus ancien ».
  const organismeId = process.env.CIVIC_ORGANISME_ID ?? body.organismeId ?? null;
  if (!organismeId) {
    return NextResponse.json({ error: "Organisme non configuré." }, { status: 503, headers: civicCors });
  }

  // Tarif : table CivicTarif (admin) sinon repli par défaut.
  const tarif = await prisma.civicTarif.findUnique({
    where: { organismeId_mention: { organismeId, mention } },
  });
  if (tarif && !tarif.actif) {
    return NextResponse.json({ error: "Offre indisponible." }, { status: 409, headers: civicCors });
  }
  const base = tarif?.prixCents ?? PRIX_DEFAUT[mention];
  const remise = Math.min(Math.max(tarif?.remisePct ?? 0, 0), 100);
  const unitAmount = Math.round(base * (1 - remise / 100));
  const devise = tarif?.devise ?? "eur";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    allow_promotion_codes: true, // codes promo Stripe en plus de la remise éventuelle
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: devise,
          unit_amount: unitAmount,
          product_data: { name: `Préparation examen civique — ${MENTION_NOM[mention]}` },
        },
      },
    ],
    metadata: {
      type: "civique",
      mention,
      prenom,
      email,
      organismeId,
      consentRetractation: body.consentRetractation ? "true" : "false",
      consentDate: new Date().toISOString(),
    },
    success_url: `${VITRINE_BASE}/cap-language-academy/examen-civique/inscription/merci?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${VITRINE_BASE}/cap-language-academy/examen-civique/inscription?annule=1`,
  });

  return NextResponse.json({ url: session.url }, { headers: civicCors });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: civicCors });
}
