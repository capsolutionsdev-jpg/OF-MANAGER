import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API publique : prochaines sessions ouvertes (pour le site vitrine).
// Lecture seule, sans données personnelles. CORS ouvert.
export async function GET() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const organismeId = process.env.VITRINE_ORGANISME_ID || undefined;

  const sessions = await prisma.session.findMany({
    where: {
      isArchived: false,
      statut: { in: ["PLANIFIEE", "OUVERTE"] },
      dateDebut: { gte: start },
      ...(organismeId ? { organismeId } : {}),
    },
    include: {
      formation: { select: { titre: true, academy: true, reference: true } },
      inscriptions: { where: { statut: { not: "ANNULEE" } }, select: { id: true } },
    },
    orderBy: { dateDebut: "asc" },
    take: 60,
  });

  const data = sessions.map((s) => {
    const inscrits = s.inscriptions.length;
    return {
      id: s.id,
      formation: s.formation.titre,
      reference: s.formation.reference,
      academy: s.formation.academy,
      dateDebut: s.dateDebut.toISOString(),
      dateFin: s.dateFin.toISOString(),
      horaires: s.horaires,
      lieu: s.lieu,
      modalite: s.modalite,
      statut: s.statut,
      placesTotal: s.nbPlaces,
      placesRestantes: Math.max(0, s.nbPlaces - inscrits),
    };
  });

  return NextResponse.json(
    { sessions: data, generatedAt: new Date().toISOString() },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
