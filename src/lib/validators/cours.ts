import { z } from "zod";
import { Academy } from "@prisma/client";

const optionalText = z.string().trim().optional().or(z.literal(""));

export const coursFormSchema = z.object({
  titre: z.string().trim().min(1, "Le titre est requis"),
  academy: z.nativeEnum(Academy),
  formationId: optionalText,
  description: optionalText,
  niveau: optionalText,
  imageUrl: optionalText,
  isPublished: z.boolean().optional(),
});

export type CoursFormValues = z.infer<typeof coursFormSchema>;

/** Une ressource téléchargeable attachée à une leçon. */
export type LeconRessource = { label: string; url: string };

/** Une image illustrant une leçon. */
export type LeconImage = { url: string; legende?: string };

/** Type de question de quiz. */
export type QuizType = "QCU" | "QCM" | "REDIGEE";

export const QUIZ_TYPE_LABELS: Record<QuizType, string> = {
  QCU: "QCU — choix unique",
  QCM: "QCM — choix multiple",
  REDIGEE: "Question rédigée",
};

/**
 * Une question de quiz de leçon.
 * - QCU : `options` + une seule bonne réponse dans `bonnes` (1 indice)
 * - QCM : `options` + plusieurs bonnes réponses dans `bonnes`
 * - REDIGEE : pas d'options ; `corrige` = réponse attendue / mots-clés
 */
export type LeconQuizItem = {
  type: QuizType;
  enonce: string;
  options: string[];
  bonnes: number[]; // indices des bonnes réponses (QCU/QCM)
  corrige?: string; // corrigé indicatif (REDIGEE)
};

/** Crée un slug URL à partir d'un titre. */
export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
