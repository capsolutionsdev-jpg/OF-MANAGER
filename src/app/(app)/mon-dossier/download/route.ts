import { getCurrentApprenant } from "@/lib/candidat-portal";
import { getTenantDb } from "@/lib/tenant";
import { fileDownloadResponse } from "@/lib/download-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Téléchargement forcé d'une pièce du dossier par le CANDIDAT connecté. Scopé par
 * candidatId (anti-IDOR) : un candidat ne récupère que SES pièces.
 */
export async function GET(req: Request) {
  const appr = await getCurrentApprenant();
  if (!appr?.candidatId) return new Response("Non autorisé.", { status: 401 });

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const id = url.searchParams.get("id") ?? "";
  if (kind !== "dossier" || !id) return new Response("Requête invalide.", { status: 400 });

  const db = await getTenantDb();
  const piece = await db.pieceJointe.findFirst({
    where: { id, candidatId: appr.candidatId },
    select: { label: true, url: true },
  });
  if (!piece) return new Response("Introuvable.", { status: 404 });
  return fileDownloadResponse(piece.url, `${piece.label.replace(/[^\w-]+/g, "-")}`);
}
