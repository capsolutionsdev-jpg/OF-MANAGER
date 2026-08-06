import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/token";
import { organismeScope } from "@/lib/public-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API publique : photos des galeries du SITE VITRINE, groupées par zone.
// Lecture seule, sans données personnelles, CORS ouvert.
// Scopé par l'env VITRINE_ORGANISME_ID.
//
// IMPORTANT : on ne renvoie JAMAIS le contenu des images ici. Sans Vercel Blob,
// les photos sont stockées en « data URL » (base64) et la réponse atteignait
// plusieurs Mo — au-delà de ce que le cache de données du site vitrine accepte,
// qui affichait alors une galerie VIDE (repli silencieux). On renvoie donc une
// URL par photo, servie par /api/public/photos/[id].
export async function GET(req: Request) {
  const organismeId = organismeScope(req);

  const photos = await prisma.photoVitrine.findMany({
    where: { ...(organismeId ? { organismeId } : {}) },
    orderBy: [{ zone: "asc" }, { ordre: "asc" }],
    select: { id: true, zone: true, url: true, legende: true },
    take: 500,
  });

  // Base absolue : le site vitrine est hébergé sur un autre domaine.
  let base: string;
  try {
    base = new URL(req.url).origin;
  } catch {
    base = appBaseUrl();
  }

  const byZone: Record<string, { url: string; legende: string | null }[]> = {
    CLIENTS_PARTENAIRES: [],
    CENTRE: [],
    ALBUM: [],
  };
  for (const p of photos) {
    // URL http (Blob/CDN) → telle quelle ; data URL → route d'image dédiée.
    const url = p.url.startsWith("http")
      ? p.url
      : `${base}/api/public/photos/${p.id}`;
    (byZone[p.zone] ??= []).push({ url, legende: p.legende });
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
