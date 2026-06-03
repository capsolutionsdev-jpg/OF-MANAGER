import { prisma } from "@/lib/prisma";
import { buildInscriptionPdf, SIGNED_DOC_TYPES } from "@/lib/documents/build-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

// Téléchargement / aperçu public (authentifié par le token du parcours).
// ?preview=1 → aperçu inline des documents à signer (avant signature).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const insc = await prisma.inscription.findUnique({
    where: { accessToken: token },
    select: { id: true, signedAt: true },
  });
  if (!insc) return new Response("Lien invalide", { status: 404 });

  const preview = new URL(req.url).searchParams.get("preview") === "1";

  // Aperçu avant signature : uniquement les documents à signer, sans certificat.
  const pdf = preview
    ? await buildInscriptionPdf(insc.id, {
        only: SIGNED_DOC_TYPES,
        includeCertificat: false,
      })
    : await buildInscriptionPdf(insc.id, { only: SIGNED_DOC_TYPES });

  if (!pdf) return new Response("Documents introuvables", { status: 404 });

  return new Response(new Uint8Array(pdf.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="${pdf.filename}"`,
    },
  });
}
