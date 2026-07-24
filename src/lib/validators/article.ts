import { z } from "zod";
import { VitrineStatut } from "@prisma/client";

const optionalText = z.string().trim().optional().or(z.literal(""));

// Slug : minuscules, chiffres et tirets uniquement (clé de jointure vitrine).
const slugSchema = z
  .string()
  .trim()
  .min(1, "Le slug est requis")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug invalide : minuscules, chiffres et tirets uniquement (ex. mon-article).",
  );

export const articleFormSchema = z.object({
  titre: z.string().trim().min(1, "Le titre est requis"),
  slug: slugSchema,
  extrait: optionalText,
  // Corps en markdown léger (## sous-titre, - puce, sinon paragraphe).
  contenu: optionalText,
  auteur: optionalText,
  categorie: optionalText,
  imageUrl: optionalText,
  imageAlt: optionalText,
  // Date de publication au format AAAA-MM-JJ (converti côté serveur).
  datePublication: optionalText,
  statut: z.nativeEnum(VitrineStatut).optional(),
});

export type ArticleFormValues = z.infer<typeof articleFormSchema>;

// Réutilise les libellés du site vitrine (brouillon / en ligne / retiré).
export const ARTICLE_STATUT_LABELS: Record<VitrineStatut, string> = {
  MASQUEE: "Brouillon (pas sur le site)",
  PUBLIEE: "Publié (en ligne)",
  SUSPENDUE: "Retiré (temporairement)",
};

/**
 * Génère un slug à partir d'un titre (accents retirés, espaces → tirets).
 * Utilisé pour pré-remplir le champ slug côté formulaire.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents (diacritiques combinants)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
