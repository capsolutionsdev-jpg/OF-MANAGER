import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { addInscriptionDossier, safeSegment, type ZipResult } from "@/lib/documents/build-zip";
import { buildContratFormateurPdf, buildCompteRenduPdf } from "@/lib/documents/build-pdf";

/**
 * ZIP HIÉRARCHIQUE du dossier complet d'une SESSION (GED — « travail propre ») :
 *
 *   <Formation>_<date>/
 *     Dossier session/
 *       Contrat-formateur.pdf         (si formateur externe affecté)
 *       Compte-rendu-formateur.pdf
 *     <NOM Prénom>/                    (un par participant)
 *       <ses documents applicables>.docx + certificat de signature
 *
 * Chaque pièce est BEST-EFFORT (try/catch) : une pièce indisponible (pas de
 * formateur, doc non applicable…) est simplement omise, le reste du dossier est
 * quand même produit.
 *
 * Sécurité : scopé par le tenant côté appelant (la route vérifie que la session
 * appartient à l'organisme courant avant d'appeler).
 */
export async function buildSessionDossierZip(sessionId: string): Promise<ZipResult> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      dateDebut: true,
      formation: { select: { titre: true } },
      inscriptions: {
        where: { statut: { not: "ANNULEE" } },
        select: { id: true },
        orderBy: { candidat: { nom: "asc" } },
      },
    },
  });
  if (!session) return null;

  const zip = new JSZip();
  const dateStr = session.dateDebut.toISOString().slice(0, 10);
  const racineName = `${safeSegment(session.formation.titre) || "Formation"}_${dateStr}`;
  const racine = zip.folder(racineName) ?? zip;

  // ── Dossier session (pièces au niveau session) ────────────────────────
  const dossierSession = racine.folder("Dossier session") ?? racine;
  const pieces: { nom: string; build: () => Promise<{ data: Uint8Array } | null> }[] = [
    { nom: "Contrat-formateur.pdf", build: () => buildContratFormateurPdf(sessionId) },
    { nom: "Compte-rendu-formateur.pdf", build: () => buildCompteRenduPdf(sessionId) },
  ];
  for (const p of pieces) {
    try {
      const pdf = await p.build();
      if (pdf) dossierSession.file(p.nom, pdf.data);
    } catch {
      // pièce indisponible → on l'omet
    }
  }

  // ── Un dossier par participant ────────────────────────────────────────
  for (const insc of session.inscriptions) {
    try {
      await addInscriptionDossier(racine, insc.id, { folderName: (nom) => nom });
    } catch {
      // dossier candidat en échec → on l'omet, le reste continue
    }
  }

  const buf = await zip.generateAsync({ type: "nodebuffer" });
  return { data: new Uint8Array(buf), filename: `Dossier_${racineName}.zip` };
}
