import { auth } from "@/auth";
import { buildInscriptionPdf } from "@/lib/documents/build-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

// Dossier PDF d'une inscription (admin) : documents signés + certificat.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ inscriptionId: string }> },
) {
  const session = await auth();
  if (!session?.user) return new Response("Non autorisé", { status: 401 });

  const { inscriptionId } = await params;
  const pdf = await buildInscriptionPdf(inscriptionId);
  if (!pdf) return new Response("Introuvable", { status: 404 });

  return new Response(new Uint8Array(pdf.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.filename}"`,
    },
  });
}
