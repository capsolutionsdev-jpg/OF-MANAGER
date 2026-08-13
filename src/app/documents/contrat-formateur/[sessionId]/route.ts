import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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

  // Cloisonnement multi-tenant (RGPD/IDOR) : uniquement les sessions de
  // l'organisme de l'utilisateur (SUPERADMIN éditeur excepté).
  const sess = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { organismeId: true },
  });
  if (!sess) return new Response("Introuvable", { status: 404 });
  if (session.user.role !== "SUPERADMIN" && sess.organismeId !== session.user.organismeId) {
    return new Response("Non autorisé", { status: 403 });
  }

  const pdf = await buildContratFormateurPdf(sessionId);
  if (!pdf)
    return new Response(
      "Contrat indisponible : un formateur EXTERNE doit être affecté (un formateur interne / salarié n'a pas de contrat de sous-traitance).",
      { status: 400 },
    );

  return new Response(new Uint8Array(pdf.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.filename}"`,
    },
  });
}
