import { prisma } from "@/lib/prisma";
import { buildContratFormateurPdf } from "@/lib/documents/build-pdf";
import { linkExpired } from "@/lib/token";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const s = await prisma.session.findUnique({
    where: { contratFormateurToken: token },
    select: { id: true, dateFin: true },
  });
  if (!s) return new Response("Lien invalide", { status: 404 });
  if (linkExpired(s.dateFin, 2)) return new Response("Lien expiré", { status: 410 });

  const pdf = await buildContratFormateurPdf(s.id);
  if (!pdf) return new Response("Document introuvable", { status: 404 });

  return new Response(new Uint8Array(pdf.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.filename}"`,
    },
  });
}
