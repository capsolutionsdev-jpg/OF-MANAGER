import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildSatisfactionPdf } from "@/lib/documents/build-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

// Fiche de satisfaction remplie (admin).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ inscriptionId: string }> },
) {
  const session = await auth();
  if (!session?.user) return new Response("Non autorisé", { status: 401 });

  const { inscriptionId } = await params;

  // Cloisonnement multi-tenant (RGPD/IDOR) : uniquement les inscriptions de
  // l'organisme de l'utilisateur (SUPERADMIN éditeur excepté).
  const insc = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    select: { organismeId: true },
  });
  if (!insc) return new Response("Introuvable", { status: 404 });
  if (session.user.role !== "SUPERADMIN" && insc.organismeId !== session.user.organismeId) {
    return new Response("Non autorisé", { status: 403 });
  }

  const pdf = await buildSatisfactionPdf(inscriptionId);
  if (!pdf) return new Response("Introuvable", { status: 404 });

  return new Response(new Uint8Array(pdf.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.filename}"`,
    },
  });
}
