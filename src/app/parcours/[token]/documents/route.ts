import { prisma } from "@/lib/prisma";
import { buildInscriptionPdf, SIGNED_DOC_TYPES } from "@/lib/documents/build-pdf";
import { linkExpired } from "@/lib/token";

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
    select: { id: true, signedAt: true, session: { select: { dateFin: true } } },
  });
  if (!insc) return new Response("Lien invalide", { status: 404 });
  // Expiration : un lien fuité ne donne plus accès aux documents 12 mois après la fin.
  if (linkExpired(insc.session?.dateFin)) {
    return new Response("Lien expiré", { status: 410 });
  }

  const preview = new URL(req.url).searchParams.get("preview") === "1";

  try {
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
  } catch (e) {
    // Diagnostic : renvoie l'erreur réelle (génération PDF / Chromium serverless).
    const msg = e instanceof Error ? `${e.message}\n\n${e.stack ?? ""}` : String(e);
    return new Response(`Erreur génération PDF:\n${msg}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
