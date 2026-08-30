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
// Rôles autorisés à uploader une image de marque (audit SEC-041 / F-21) :
// personnel de l'OF + éditeur (console). Exclut APPRENANT/FORMATEUR/ENTREPRISE.
const UPLOAD_ROLES = new Set(["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"]);

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || !role || !UPLOAD_ROLES.has(role)) {
    return new Response("Non autorisé.", { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Aucun fichier reçu." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Fichier trop volumineux (max 4 Mo)." }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const detected = detectFileType(buf);
  if (!isRasterImage(detected)) {
    return Response.json({ error: "Format non supporté (image PNG/JPEG/WEBP/GIF attendue)." }, { status: 415 });
  }

  const rawFolder = String(form.get("folder") ?? "uploads").replace(/[^a-z0-9/_-]/gi, "") || "uploads";
  // Cloisonnement (audit A05-012) : préfixer le chemin par l'organisme évite toute
  // collision/écrasement logique entre tenants dans le store blob (le SUPERADMIN
  // éditeur, sans organisme, range sous "_editor").
  const orgId = (session.user as { organismeId?: string | null }).organismeId ?? null;
  const folder = `${orgId ?? "_editor"}/${rawFolder}`;
  const url = await storeUpload({ data: buf, folder, ext: extFromMime(detected!), contentType: detected! });
  return Response.json({ url, stored: process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "data-url" });
}
