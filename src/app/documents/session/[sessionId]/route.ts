import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildSessionDossierZip } from "@/lib/documents/build-session-zip";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * ZIP hiérarchique du dossier complet d'une SESSION (GED) : « Dossier session »
 * (contrat/CR formateur) + un dossier par participant. Téléchargement direct
 * (attachment), nommé `Dossier_<Formation>_<date>.zip`.
 *
 * Cloisonnement multi-tenant : on ne sert que les sessions de l'organisme de
 * l'utilisateur (SUPERADMIN éditeur excepté) — anti-IDOR par identifiant deviné.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth();
  if (!session?.user) return new Response("Non autorisé", { status: 401 });

  const { sessionId } = await params;

  const s = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { organismeId: true },
  });
  if (!s) return new Response("Introuvable", { status: 404 });
  if (session.user.role !== "SUPERADMIN" && s.organismeId !== session.user.organismeId) {
    return new Response("Non autorisé", { status: 403 });
  }

  const zip = await buildSessionDossierZip(sessionId);
  if (!zip) return new Response("Introuvable", { status: 404 });

  return new Response(new Uint8Array(zip.data), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zip.filename}"`,
    },
  });
}
