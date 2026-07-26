import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API publique : photos des galeries du SITE VITRINE, groupées par zone.
// Lecture seule, sans données personnelles, CORS ouvert.
// Scopé par l'env VITRINE_ORGANISME_ID.
export async function GET() {
  const organismeId = process.env.VITRINE_ORGANISME_ID || undefined;

  const photos = await prisma.photoVitrine.findMany({
    where: { ...(organismeId ? { organismeId } : {}) },
    orderBy: [{ zone: "asc" }, { ordre: "asc" }],
    select: { zone: true, url: true, legende: true },
    take: 500,
  });

  const byZone: Record<string, { url: string; legende: string | null }[]> = {
    CLIENTS_PARTENAIRES: [],
    CENTRE: [],
    ALBUM: [],
  };
  for (const p of photos) {
    (byZone[p.zone] ??= []).push({ url: p.url, legende: p.legende });
  }

  return NextResponse.json(
    { photos: byZone, generatedAt: new Date().toISOString() },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
