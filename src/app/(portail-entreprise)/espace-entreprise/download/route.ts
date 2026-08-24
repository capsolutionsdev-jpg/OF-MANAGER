import { getCurrentEntreprise } from "@/lib/entreprise-portal";
import { getTenantDb } from "@/lib/tenant";
import { fileDownloadResponse } from "@/lib/download-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Téléchargement forcé (attachment) des documents du CLIENT B2B. Toujours scopé
 * par `entrepriseId` (anti-IDOR) : un client ne peut télécharger que SES fichiers.
 * `kind` = convention | convention-signe | facture | document ; `id` = identifiant.
 */
export async function GET(req: Request) {
  const entreprise = await getCurrentEntreprise();
  if (!entreprise) return new Response("Non autorisé.", { status: 401 });

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const id = url.searchParams.get("id") ?? "";
  if (!id) return new Response("Requête invalide.", { status: 400 });

  const db = await getTenantDb();

  if (kind === "convention" || kind === "convention-signe") {
    const conv = await db.convention.findFirst({
      where: { id, entrepriseId: entreprise.id },
      select: { reference: true, fileUrl: true, fileUrlSigne: true },
    });
    if (!conv) return new Response("Introuvable.", { status: 404 });
    const signe = kind === "convention-signe";
    return fileDownloadResponse(
      signe ? conv.fileUrlSigne : conv.fileUrl,
      `Convention-${conv.reference}${signe ? "-signee" : ""}.pdf`,
    );
  }

  if (kind === "facture") {
    const fac = await db.facture.findFirst({
      where: { id, entrepriseId: entreprise.id },
      select: { reference: true, fileUrl: true },
    });
    if (!fac) return new Response("Introuvable.", { status: 404 });
    return fileDownloadResponse(fac.fileUrl, `Facture-${fac.reference}.pdf`);
  }

  if (kind === "document") {
    const doc = await db.documentGenere.findFirst({
      where: { id, inscription: { entrepriseId: entreprise.id } },
      select: { type: true, fileUrl: true },
    });
    if (!doc) return new Response("Introuvable.", { status: 404 });
    return fileDownloadResponse(doc.fileUrl, `${doc.type}.pdf`);
  }

  if (kind === "dossier") {
    // Pièce du dossier administratif d'un salarié (scopée entreprise via le candidat).
    const piece = await db.pieceJointe.findFirst({
      where: { id, candidat: { entrepriseId: entreprise.id } },
      select: { label: true, url: true },
    });
    if (!piece) return new Response("Introuvable.", { status: 404 });
    return fileDownloadResponse(piece.url, `${piece.label.replace(/[^\w-]+/g, "-")}`);
  }

  return new Response("Requête invalide.", { status: 400 });
}
