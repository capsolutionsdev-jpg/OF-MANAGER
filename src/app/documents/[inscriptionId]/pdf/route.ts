import { auth } from "@/auth";
import { getInscriptionDossierPdf } from "@/lib/documents/pdf-cache";

export const runtime = "nodejs";
export const maxDuration = 60;

// Dossier PDF d'une inscription (admin) : documents signés + certificat.
// Servi depuis le cache en base (rapide) ; `?fresh=1` force la régénération.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ inscriptionId: string }> },
) {
  const session = await auth();
  if (!session?.user) return new Response("Non autorisé", { status: 401 });

  const { inscriptionId } = await params;
  const fresh = new URL(req.url).searchParams.get("fresh") === "1";
  const pdf = await getInscriptionDossierPdf(inscriptionId, fresh);
  if (!pdf) return new Response("Introuvable", { status: 404 });

  return new Response(new Uint8Array(pdf.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.filename}"`,
    },
  });
}
