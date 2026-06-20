import { auth } from "@/auth";
import { storeUpload, detectFileType, isRasterImage, extFromMime } from "@/lib/blob";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // 4 Mo

/**
 * Upload d'un fichier de marque (logo / cachet / signature…).
 * Réservé aux utilisateurs authentifiés. Le type est validé d'après les OCTETS
 * du fichier (magic bytes), pas le MIME annoncé par le client (spoofable). Seules
 * les images matricielles sont acceptées — SVG refusé (vecteur XSS).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Non authentifié.", { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Aucun fichier reçu." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Fichier trop volumineux (max 4 Mo)." }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const detected = detectFileType(buf);
  if (!isRasterImage(detected)) {
    return Response.json({ error: "Format non supporté (image PNG/JPEG/WEBP/GIF attendue)." }, { status: 415 });
  }

  const folder = String(form.get("folder") ?? "uploads").replace(/[^a-z0-9/_-]/gi, "") || "uploads";
  const url = await storeUpload({ data: buf, folder, ext: extFromMime(detected!), contentType: detected! });
  return Response.json({ url, stored: process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "data-url" });
}
