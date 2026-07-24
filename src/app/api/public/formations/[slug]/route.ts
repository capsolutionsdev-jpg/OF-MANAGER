import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API publique : FICHE COMPLÈTE d'une formation pour le SITE VITRINE.
// Lecture seule, sans données personnelles, CORS ouvert.
// Ne renvoie que les formations PUBLIEE (jointure par `reference` = slug d'URL).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const organismeId = process.env.VITRINE_ORGANISME_ID || undefined;

  const f = await prisma.formation.findFirst({
    where: {
      reference: slug,
      isArchived: false,
      vitrineStatut: "PUBLIEE",
      ...(organismeId ? { organismeId } : {}),
    },
    select: {
      reference: true,
      titre: true,
      academy: true,
      duree: true,
      tarif: true,
      certification: true,
      objectifs: true,
      programme: true,
      publicVise: true,
      prerequis: true,
      methodesPedagogiques: true,
      modalitesEvaluation: true,
      delaiAcces: true,
      vitrineTagline: true,
      vitrineDescription: true,
      vitrineImageUrl: true,
      vitrineCompetences: true,
      vitrineValidite: true,
      vitrineModalites: true,
    },
  });

  if (!f) {
    return NextResponse.json(
      { formation: null },
      { status: 404, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }

  const euro = new Intl.NumberFormat("fr-FR");
  const formation = {
    ...f,
    tarif: f.tarif != null ? `${euro.format(Number(f.tarif))} € HT` : null,
  };

  return NextResponse.json(
    { formation, generatedAt: new Date().toISOString() },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
