import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildInscriptionDocsZip } from "@/lib/documents/build-zip";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ inscriptionId: string }> },
) {
  const session = await auth();
  if (!session?.user) return new Response("Non autorisé", { status: 401 });

  const { inscriptionId } = await params;

  // Cloisonnement multi-tenant (anti-IDOR) : on ne sert que les inscriptions de
  // l'organisme de l'utilisateur (SUPERADMIN éditeur excepté). Sans ce garde,
  // n'importe quel compte authentifié pouvait télécharger le ZIP des documents
  // d'un candidat d'un autre OF via un identifiant deviné.
  const insc = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    select: { organismeId: true },
  });
  if (!insc) return new Response("Inscription introuvable", { status: 404 });
  if (session.user.role !== "SUPERADMIN" && insc.organismeId !== session.user.organismeId) {
    return new Response("Non autorisé", { status: 403 });
  }

  const zip = await buildInscriptionDocsZip(inscriptionId);
  if (!zip) return new Response("Inscription introuvable", { status: 404 });

  return new Response(new Uint8Array(zip.data), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zip.filename}"`,
    },
  });
}
