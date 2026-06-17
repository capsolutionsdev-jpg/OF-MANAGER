import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";

// Grilles de certification OFFICIELLES INRS (documents réglementaires).
// On NE les reproduit PAS : on ouvre le PDF officiel et on PRÉ-REMPLIT les
// champs d'identification (stagiaire, dates, formateur). L'évaluation des
// compétences (cases « Acquise / Non acquise ») reste vierge pour le formateur.
//
// Sources dans public/inrs/ (versions déchiffrées des originaux INRS) :
//   - grille-sst.pdf      → Grille de certification des compétences du SST (juin 2020)
//   - grille-mac-sst.pdf  → Grille MAC SST (juillet 2023)

const FILES: Record<string, string> = {
  SST: "grille-sst.pdf",
  MAC_SST: "grille-mac-sst.pdf",
};

export const GRILLE_INRS_LABELS: Record<string, string> = {
  SST: "SST",
  MAC_SST: "MAC SST",
};

export const GRILLE_INRS_OPTIONS = [
  { value: "", label: "Aucune (pas de grille INRS)" },
  { value: "SST", label: "Grille SST (INRS)" },
  { value: "MAC_SST", label: "Grille MAC SST (INRS)" },
];

export type GrilleInrsData = {
  nom?: string | null;
  prenom?: string | null;
  dateNaissance?: string | null;
  dateDebut?: string | null;
  dateFin?: string | null;
  nomFormateur?: string | null;
  prenomFormateur?: string | null;
  dateCertification?: string | null;
};

/**
 * Ouvre la grille INRS officielle et pré-remplit les champs d'identité.
 * Retourne le PDF (octets) ou null si la clé de grille est inconnue.
 */
export async function fillGrilleInrs(
  grilleKey: string | null | undefined,
  data: GrilleInrsData,
): Promise<Uint8Array | null> {
  if (!grilleKey) return null;
  const file = FILES[grilleKey];
  if (!file) return null;

  const bytes = await readFile(path.join(process.cwd(), "public", "inrs", file));
  const pdf = await PDFDocument.load(bytes);
  const form = pdf.getForm();

  const set = (name: string, value?: string | null) => {
    if (!value) return;
    try {
      form.getTextField(name).setText(value);
    } catch {
      /* champ absent dans cette version de grille : ignoré */
    }
  };

  set("Nom", data.nom);
  set("Prénom", data.prenom);
  set("Date de naissance", data.dateNaissance);
  set("Date début", data.dateDebut);
  set("Date fin", data.dateFin);
  set("Nom Formateur", data.nomFormateur);
  set("Prénom Formateur", data.prenomFormateur);
  set("Date Certification", data.dateCertification);

  // On laisse le formulaire éditable : le formateur complète l'évaluation
  // (cases Acquise/Non acquise) puis signe, comme sur la grille officielle.
  return pdf.save();
}
