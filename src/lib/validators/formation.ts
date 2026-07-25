import { z } from "zod";
import { Modalite, Academy, VitrineStatut } from "@prisma/client";

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
  // Publication sur le site vitrine (piloté depuis la console).
  vitrineStatut: z.nativeEnum(VitrineStatut).optional(),
  numeroAgrement: optionalText,
  // Contenu de présentation vitrine (formations créées EN console).
  vitrineTagline: optionalText,
  vitrineDescription: optionalText,
  vitrineImageUrl: optionalText,
  vitrineCompetences: optionalText, // 1 compétence par ligne, converti côté serveur
  vitrineValidite: optionalText,
  vitrineModalites: optionalText,
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
  // Grille de certification officielle INRS à pré-remplir ("SST" / "MAC_SST").
  grilleInrs: z.string().optional(),
  // Formation diplômante (→ suivi de diplômes + attestation de remise).
  diplomante: z.boolean().optional(),
  // Examen soumis à un jury (→ gestion de jury) + nombre de jurés attendus.
  soumisJury: z.boolean().optional(),
  nbJury: z.string().optional(),
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

export const VITRINE_STATUT_LABELS: Record<VitrineStatut, string> = {
  MASQUEE: "Masquée (pas sur le site)",
  PUBLIEE: "Publiée (visible sur le site)",
  SUSPENDUE: "Suspendue (temporairement retirée)",
};
