import { put } from "@vercel/blob";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // 4 Mo
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"];

/**
 * Upload d'un fichier (logo / cachet / signature…).
 * - Si `BLOB_READ_WRITE_TOKEN` est défini (prod Vercel) → stockage Vercel Blob,
 *   renvoie une URL publique pérenne.
 * - Sinon (dev/local sans token) → repli en data-URL base64 (comme avant), afin
 *   que l'upload reste fonctionnel hors production.
 * Réservé aux utilisateurs authentifiés.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Non authentifié.", { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Aucun fichier reçu." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Fichier trop volumineux (max 4 Mo)." }, { status: 413 });
  if (file.type && !ALLOWED.includes(file.type))
    return Response.json({ error: "Format non supporté (image attendue)." }, { status: 415 });

  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const folder = String(form.get("folder") ?? "uploads").replace(/[^a-z0-9/_-]/gi, "");

  // Production : Vercel Blob.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${folder}/${Date.now()}.${ext}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type || undefined,
    });
    return Response.json({ url: blob.url, stored: "blob" });
  }

  // Repli local : data-URL base64.
  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type || "image/png"};base64,${buf.toString("base64")}`;
  return Response.json({ url: dataUrl, stored: "data-url" });
}
