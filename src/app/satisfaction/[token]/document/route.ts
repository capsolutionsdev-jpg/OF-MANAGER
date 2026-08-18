import { prisma } from "@/lib/prisma";
import { buildSatisfactionPdf } from "@/lib/documents/build-pdf";
import { linkExpired } from "@/lib/token";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const i = await prisma.inscription.findUnique({
    where: { satisfactionToken: token },
    select: { id: true, session: { select: { dateFin: true } } },
  });
  if (!i) return new Response("Lien invalide", { status: 404 });
  if (linkExpired(i.session?.dateFin, 6)) return new Response("Lien expiré", { status: 410 });

  const pdf = await buildSatisfactionPdf(i.id);
  if (!pdf) return new Response("Document introuvable", { status: 404 });

  return new Response(new Uint8Array(pdf.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.filename}"`,
    },
  });
}
