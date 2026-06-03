import { auth } from "@/auth";
import { buildContratFormateurPdf } from "@/lib/documents/build-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth();
  if (!session?.user) return new Response("Non autorisé", { status: 401 });

  const { sessionId } = await params;
  const pdf = await buildContratFormateurPdf(sessionId);
  if (!pdf)
    return new Response(
      "Contrat indisponible (vérifiez qu'un formateur est affecté).",
      { status: 400 },
    );

  return new Response(new Uint8Array(pdf.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.filename}"`,
    },
  });
}
