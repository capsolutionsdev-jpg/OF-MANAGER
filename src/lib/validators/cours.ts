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

/** Une question de quiz de leçon. */
export type LeconQuizItem = {
  enonce: string;
  options: string[];
  reponse: number;
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
