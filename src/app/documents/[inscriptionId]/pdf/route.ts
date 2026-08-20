import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getInscriptionDossierPdf } from "@/lib/documents/pdf-cache";
import { buildInscriptionPdf } from "@/lib/documents/build-pdf";

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

  // Cloisonnement multi-tenant : on ne sert que les inscriptions de l'organisme
  // de l'utilisateur (le SUPERADMIN éditeur peut tout consulter). Empêche l'accès
  // au dossier d'un candidat d'un autre OF via un identifiant deviné (RGPD/IDOR).
  const insc = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    select: { organismeId: true },
  });
  if (!insc) return new Response("Introuvable", { status: 404 });
  if (session.user.role !== "SUPERADMIN" && insc.organismeId !== session.user.organismeId) {
    return new Response("Non autorisé", { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  const presign = sp.get("presign") === "1";
  const fresh = sp.get("fresh") === "1";
  // Consultation AVANT signature (?presign=1) : uniquement les documents à consulter
  // (fiche, contrat/convention, CGV, règlement, programme) — jamais d'attestations
  // ni de convocation. Généré à la volée (sous-ensemble), pas depuis le cache du
  // dossier complet. Sinon : dossier complet (cache).
  const pdf = presign
    ? await buildInscriptionPdf(inscriptionId, { presignOnly: true, includeCertificat: false })
    : await getInscriptionDossierPdf(inscriptionId, fresh);
  if (!pdf) return new Response("Introuvable", { status: 404 });

  return new Response(new Uint8Array(pdf.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.filename}"`,
    },
  });
}
