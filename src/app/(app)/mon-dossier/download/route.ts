import { getCurrentApprenant } from "@/lib/candidat-portal";
import { getTenantDb } from "@/lib/tenant";
import { fileDownloadResponse } from "@/lib/download-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Téléchargement d'un document du dossier par le CANDIDAT connecté, servi EN FLUX :
 * l'URL de stockage brute (Vercel Blob) n'est JAMAIS exposée au navigateur (audit
 * A08-003). Scopé par candidatId (anti-IDOR) : un candidat ne récupère que SES
 * documents.
 *  - kind=dossier   : pièce déposée (PieceJointe)
 *  - kind=document  : document généré (attestation, certificat…) rattaché à une de
 *                     ses inscriptions
 */
export async function GET(req: Request) {
  const appr = await getCurrentApprenant();
  if (!appr?.candidatId) return new Response("Non autorisé.", { status: 401 });

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const id = url.searchParams.get("id") ?? "";
  if (!id || (kind !== "dossier" && kind !== "document")) {
    return new Response("Requête invalide.", { status: 400 });
  }

  const db = await getTenantDb();

  if (kind === "dossier") {
    const piece = await db.pieceJointe.findFirst({
      where: { id, candidatId: appr.candidatId },
      select: { label: true, url: true },
    });
    if (!piece) return new Response("Introuvable.", { status: 404 });
    return fileDownloadResponse(piece.url, piece.label.replace(/[^\w-]+/g, "-"));
  }

  // kind === "document" : document généré rattaché à une inscription du candidat.
  const doc = await db.documentGenere.findFirst({
    where: { id, inscription: { candidatId: appr.candidatId } },
    select: { type: true, fileUrl: true },
  });
  if (!doc) return new Response("Introuvable.", { status: 404 });
  return fileDownloadResponse(doc.fileUrl, `${doc.type}.pdf`);
}
