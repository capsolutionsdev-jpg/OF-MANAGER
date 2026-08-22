import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { addInscriptionDossier, safeSegment, safeFolderName, type ZipResult } from "@/lib/documents/build-zip";
import { buildContratFormateurPdf, buildCompteRenduPdf } from "@/lib/documents/build-pdf";

// Garde-fou anti-timeout : au-delà, on tronque + on note (session inhabituellement
// grande). Une session de formation dépasse rarement quelques dizaines de places.
const MAX_PARTICIPANTS = 80;

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
  // Garde-fou anti-timeout : borne le nombre de participants traités par exécution.
  const participants = session.inscriptions.slice(0, MAX_PARTICIPANTS);
  const tronque = session.inscriptions.length - participants.length;

  // Noms de dossier UNIQUES : deux homonymes (mêmes prénom+nom) écraseraient sinon
  // leurs dossiers l'un l'autre dans le ZIP (JSZip indexe par chemin) → perte
  // silencieuse. On suffixe « (2) », « (3) »… en cas de collision.
  const used = new Map<string, number>();
  const uniqueName = (nom: string): string => {
    const base = nom || "Candidat";
    const key = safeFolderName(base);
    const n = (used.get(key) ?? 0) + 1;
    used.set(key, n);
    return n === 1 ? base : `${base} (${n})`;
  };

  for (const insc of participants) {
    try {
      await addInscriptionDossier(racine, insc.id, { folderName: uniqueName });
    } catch {
      // dossier candidat en échec → on l'omet, le reste continue
    }
  }

  if (tronque > 0) {
    racine.file(
      "LISEZMOI.txt",
      `Cette session compte ${session.inscriptions.length} participants. Pour rester dans les limites de génération, ` +
        `seuls les ${participants.length} premiers sont inclus dans ce ZIP (${tronque} non inclus). ` +
        `Téléchargez le dossier de chaque participant restant depuis sa fiche.`,
    );
  }

  const buf = await zip.generateAsync({ type: "nodebuffer" });
  return { data: new Uint8Array(buf), filename: `Dossier_${racineName}.zip` };
}
