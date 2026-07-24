import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API publique : état de publication des formations pour le SITE VITRINE.
// Lecture seule, sans données personnelles, CORS ouvert.
//
// Ne renvoie que les formations dont le statut vitrine a été DÉCIDÉ
// (PUBLIEE ou SUSPENDUE) : les brouillons (MASQUEE, valeur par défaut) sont
// omis → le vitrine conserve alors sa fiche statique par défaut.
//
// Le vitrine joint ces entrées par `reference` :
//   - PUBLIEE   → formation affichée (tarif live si fourni)
//   - SUSPENDUE → formation retirée du catalogue
//
// Portée : par défaut toutes les formations ; scopable à un organisme via
// l'env VITRINE_ORGANISME_ID (recommandé en multi-tenant).
export async function GET() {
  const organismeId = process.env.VITRINE_ORGANISME_ID || undefined;

  const formations = await prisma.formation.findMany({
    where: {
      isArchived: false,
      vitrineStatut: { in: ["PUBLIEE", "SUSPENDUE"] },
      ...(organismeId ? { organismeId } : {}),
    },
    select: {
      reference: true,
      titre: true,
      academy: true,
      duree: true,
      tarif: true,
      certification: true,
      vitrineStatut: true,
      vitrineTagline: true,
      vitrineImageUrl: true,
    },
    orderBy: { titre: "asc" },
    take: 200,
  });

  const euro = new Intl.NumberFormat("fr-FR");
  const data = formations.map((f) => ({
    reference: f.reference,
    titre: f.titre,
    academy: f.academy,
    duree: f.duree,
    certification: f.certification,
    vitrineStatut: f.vitrineStatut,
    tarif: f.tarif != null ? `${euro.format(Number(f.tarif))} € HT` : null,
    tagline: f.vitrineTagline,
    image: f.vitrineImageUrl,
  }));

  return NextResponse.json(
    { formations: data, generatedAt: new Date().toISOString() },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
