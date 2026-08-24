import { requireStaffTenant } from "@/lib/tenant";
import { fileDownloadResponse } from "@/lib/download-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Téléchargement forcé (attachment) côté STAFF depuis la fiche client-pro. Le
 * client BD est cloisonné par organisme (getTenantDb via requireStaffTenant), donc
 * un collaborateur ne télécharge que les fichiers de SON organisme.
 * `kind` = convention | convention-signe | facture ; `id` = identifiant.
 */
export async function GET(req: Request) {
  const { db } = await requireStaffTenant();

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const id = url.searchParams.get("id") ?? "";
  if (!id) return new Response("Requête invalide.", { status: 400 });

  if (kind === "convention" || kind === "convention-signe") {
    const conv = await db.convention.findFirst({
      where: { id },
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
      where: { id },
      select: { reference: true, fileUrl: true },
    });
    if (!fac) return new Response("Introuvable.", { status: 404 });
    return fileDownloadResponse(fac.fileUrl, `Facture-${fac.reference}.pdf`);
  }

  if (kind === "document") {
    // Document généré (ex. satisfaction entreprise déposée par le client).
    const doc = await db.documentGenere.findFirst({
      where: { id },
      select: { type: true, fileUrl: true },
    });
    if (!doc) return new Response("Introuvable.", { status: 404 });
    return fileDownloadResponse(doc.fileUrl, `${doc.type}.pdf`);
  }

  return new Response("Requête invalide.", { status: 400 });
}
