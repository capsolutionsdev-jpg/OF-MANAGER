import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API publique : sert UNE photo de galerie du site vitrine, en binaire.
//
// Pourquoi cette route : sans Vercel Blob (BLOB_READ_WRITE_TOKEN absent), les
// photos sont stockées en « data URL » (base64) dans PhotoVitrine.url. Les
// renvoyer toutes dans /api/public/photos produisait une réponse de plusieurs
// Mo — trop lourde pour le cache de données du site vitrine, qui retombait
// alors silencieusement sur une galerie vide.
// Ici, chaque image est servie séparément, en octets, avec un cache long.

const MIMES_AUTORISES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const photo = await prisma.photoVitrine.findUnique({
    where: { id },
    select: { url: true, organismeId: true },
  });
  if (!photo) return new Response("Introuvable", { status: 404 });

  // Cloisonnement : on ne sert que les photos du site vitrine configuré.
  const organismeId = process.env.VITRINE_ORGANISME_ID || undefined;
  if (organismeId && photo.organismeId !== organismeId) {
    return new Response("Introuvable", { status: 404 });
  }

  // Photo déjà hébergée (Vercel Blob) → simple redirection vers le CDN.
  if (photo.url.startsWith("http")) {
    return Response.redirect(photo.url, 302);
  }

  // Photo en data URL → on renvoie les octets décodés.
  const m = /^data:([^;,]+);base64,([\s\S]+)$/.exec(photo.url);
  if (!m) return new Response("Format non pris en charge", { status: 415 });

  const contentType = m[1].toLowerCase();
  if (!MIMES_AUTORISES.has(contentType)) {
    return new Response("Format non pris en charge", { status: 415 });
  }

  const bytes = Buffer.from(m[2], "base64");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes.length),
      // Le contenu d'un id donné ne change jamais → cache long + CORS ouvert.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
