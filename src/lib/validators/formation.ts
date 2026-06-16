import { z } from "zod";
import { Modalite, Academy } from "@prisma/client";

const optionalText = z.string().trim().optional().or(z.literal(""));

export const formationFormSchema = z.object({
  titre: z.string().trim().min(1, "Le titre est requis"),
  reference: z.string().trim().min(1, "La référence est requise"),
  certification: optionalText,
  duree: optionalText,
  dureeHeures: optionalText, // saisi en texte, converti côté serveur
  tarif: optionalText,
  modalite: z.nativeEnum(Modalite),
  academy: z.nativeEnum(Academy).or(z.literal("")).optional(),
  objectifs: optionalText,
  programme: optionalText,
  prerequis: optionalText,
  publicVise: optionalText,
  methodesPedagogiques: optionalText,
  modalitesEvaluation: optionalText,
  conditionsAcces: optionalText,
  delaiAcces: optionalText,
  // Pièces du dossier administratif : saisies en texte (1 par ligne), converties en tableau côté serveur
  piecesAttendues: optionalText,
  // Formation soumise à un examen (→ convocation d'examen).
  examen: z.boolean().optional(),
});

export type FormationFormValues = z.infer<typeof formationFormSchema>;

export const MODALITE_LABELS: Record<Modalite, string> = {
  PRESENTIEL: "Présentiel",
  DISTANCIEL: "À distance",
  MIXTE: "Mixte (blended)",
};

export const ACADEMY_LABELS: Record<Academy, string> = {
  DIGITAL: "CAP Digital Academy",
  SAFETY: "CAP Safety Academy",
  TRANSPORT: "CAP Transport Academy",
  LANGUE: "CAP Language Academy",
};

export const ACADEMY_ORDER: Academy[] = ["DIGITAL", "SAFETY", "TRANSPORT", "LANGUE"];
