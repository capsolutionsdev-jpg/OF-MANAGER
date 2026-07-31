import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTauxReussite } from "@/lib/vitrine-stats";

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
      id: true,
      reference: true,
      titre: true,
      academy: true,
      duree: true,
      tarif: true,
      certification: true,
      numeroAgrement: true,
      vitrineStatut: true,
      vitrineTagline: true,
      vitrineImageUrl: true,
      vitrineFormules: true,
    },
    orderBy: { titre: "asc" },
    take: 200,
  });

  // Taux de réussite par formation (calculé depuis les résultats de certification).
  const taux = await getTauxReussite({ organismeId });

  const euro = new Intl.NumberFormat("fr-FR");
  const data = formations.map((f) => {
    const t = taux.get(f.id);
    return {
      reference: f.reference,
      titre: f.titre,
      academy: f.academy,
      duree: f.duree,
      certification: f.certification,
      numeroAgrement: f.numeroAgrement,
      vitrineStatut: f.vitrineStatut,
      tarif: f.tarif != null ? `${euro.format(Number(f.tarif))} € HT` : null,
      tagline: f.vitrineTagline,
      image: f.vitrineImageUrl,
      formules: f.vitrineFormules ?? null,
      tauxReussite: t?.taux ?? null,
      nbEvalues: t?.nbEvalues ?? null,
    };
  });

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
