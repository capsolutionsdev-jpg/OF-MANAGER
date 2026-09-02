import "server-only";
import { prisma } from "@/lib/prisma";
import { buildInscriptionPdf, type PdfResult } from "@/lib/documents/build-pdf";

/**
 * Cache du dossier PDF complet d'une inscription (perf).
 *
 * Le dossier est régénéré (Chromium) uniquement si son contenu a pu changer —
 * suivi via une « version » dérivée des `updatedAt` de l'inscription, du candidat,
 * de la session et de la formation. Sinon, les octets sont servis directement
 * depuis la base : plus de démarrage Chromium à chaque ouverture.
 *
 * NB : on ne cache QUE le dossier par défaut (buildInscriptionPdf sans options).
 * La marque de l'organisme (logo/cachet/représentant) change rarement ; en cas de
 * mise à jour, forcer la régénération via `?fresh=1` (ou bumper TEMPLATE_VERSION).
 */

// Bumper pour invalider TOUS les caches d'un coup (ex. refonte des gabarits).
// v2 : dates « Fait le » par type de document (chronologie de la formation) —
// bump = invalide les dossiers PDF en cache générés avec la date uniforme.
const TEMPLATE_VERSION = "v2";

/** Ne cache pas les très gros PDF en base (garde-fou anti-bloat). */
const MAX_CACHE_BYTES = 8 * 1024 * 1024; // 8 Mo

function computeVersion(parts: (Date | null | undefined)[]): string {
  return `${TEMPLATE_VERSION}:${parts.map((d) => d?.getTime() ?? 0).join(":")}`;
}

export async function getInscriptionDossierPdf(
  inscriptionId: string,
  fresh = false,
): Promise<PdfResult> {
  const row = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    select: {
      updatedAt: true,
      dossierPdfVersion: true,
      dossierPdf: true,
      dossierPdfName: true,
      candidat: { select: { updatedAt: true } },
      session: {
        select: { updatedAt: true, formation: { select: { updatedAt: true } } },
      },
    },
  });
  if (!row) return null;

  const version = computeVersion([
    row.updatedAt,
    row.candidat?.updatedAt,
    row.session?.updatedAt,
    row.session?.formation?.updatedAt,
  ]);

  // Cache HIT : octets à jour servis depuis la base.
  if (!fresh && row.dossierPdfVersion === version && row.dossierPdf && row.dossierPdfName) {
    return { data: new Uint8Array(row.dossierPdf), filename: row.dossierPdfName };
  }

  // Cache MISS : génération, puis mémorisation best-effort.
  const pdf = await buildInscriptionPdf(inscriptionId);
  if (!pdf) return null;

  if (pdf.data.byteLength <= MAX_CACHE_BYTES) {
    try {
      await prisma.inscription.update({
        where: { id: inscriptionId },
        data: {
          dossierPdf: Buffer.from(pdf.data),
          dossierPdfVersion: version,
          dossierPdfName: pdf.filename,
        },
      });
    } catch {
      /* cache best-effort : ne jamais faire échouer l'ouverture */
    }
  }
  return pdf;
}
