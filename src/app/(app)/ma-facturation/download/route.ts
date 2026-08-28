import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fileDownloadResponse } from "@/lib/download-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];

/**
 * Télécharge le justificatif d'une facture formateur EN FLUX : l'URL de stockage
 * brute (Vercel Blob) n'est JAMAIS exposée au navigateur (audit A08-003).
 * Autorisé pour :
 *  - le FORMATEUR propriétaire de la facture (session) ;
 *  - le personnel back-office du MÊME organisme (session).
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Non autorisé.", { status: 401 });

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return new Response("Requête invalide.", { status: 400 });

  const facture = await prisma.factureFormateur.findUnique({
    where: { id },
    select: { reference: true, fichierUrl: true, formateurId: true, organismeId: true },
  });
  if (!facture) return new Response("Introuvable.", { status: 404 });

  const role = session.user.role as string;
  let allowed = false;
  if (STAFF.includes(role) && session.user.organismeId === facture.organismeId) {
    allowed = true;
  } else if (role === "FORMATEUR") {
    const f = await prisma.formateur.findUnique({
      where: { userId: session.user.id as string },
      select: { id: true },
    });
    if (f?.id === facture.formateurId) allowed = true;
  }
  if (!allowed) return new Response("Accès refusé.", { status: 403 });

  return fileDownloadResponse(facture.fichierUrl, `Facture-${facture.reference ?? id}`);
}
