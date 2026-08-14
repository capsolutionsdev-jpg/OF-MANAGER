/**
 * Phase 3.1 — Formulaire Candidat Pagination
 * Schema validation + type definitions
 */

import { z } from "zod";

// Types des étapes
export type FormStep = "identite" | "adresse" | "formation" | "prerequis" | "confirmation";

/**
 * Étape 1 : Identité (5 champs)
 */
export const identiteSchema = z.object({
  firstName: z.string().min(2, "Prénom requis").max(50),
  lastName: z.string().min(2, "Nom requis").max(50),
  email: z.string().email("Email invalide"),
  phone: z.string().regex(/^[0-9\s\-\+\.]+$/, "Téléphone invalide"),
  dateOfBirth: z.string().refine((date) => {
    const d = new Date(date);
    const age = new Date().getFullYear() - d.getFullYear();
    return age >= 16 && age <= 120;
  }, "Âge invalide (16-120 ans)"),
});

/**
 * Étape 2 : Adresse (6 champs)
 */
export const adresseSchema = z.object({
  street: z.string().min(5, "Rue requise"),
  street2: z.string().optional(),
  postalCode: z.string().regex(/^\d{5}$/, "Code postal invalide"),
  city: z.string().min(2, "Ville requise"),
  region: z.string().min(2, "Région requise"),
  country: z.string().default("France"),
});

/**
 * Étape 3 : Formation (3 champs)
 */
export const formationSchema = z.object({
  formationId: z.string().uuid("Formation requise"),
  modalite: z.enum(["presentiel", "distanciel", "hybrid"]),
  specificites: z.array(z.string()).optional(),
});

/**
 * Étape 4 : Prérequis (dynamique selon formation)
 */
export const prerequisSchema = z.object({
  documents: z
    .array(
      z.object({
        type: z.string(), // 'sst_card', 'cnaps', 'diploma', etc.
        file: z.instanceof(File).optional(),
        expiryDate: z.string().optional(),
      })
    )
    .optional(),
});

/**
 * Données complètes du formulaire
 */
export const candidatFormSchema = z.object({
  // Step 1
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  dateOfBirth: z.string(),

  // Step 2
  street: z.string(),
  street2: z.string().optional(),
  postalCode: z.string(),
  city: z.string(),
  region: z.string(),
  country: z.string(),

  // Step 3
  formationId: z.string(),
  modalite: z.enum(["presentiel", "distanciel", "hybrid"]),
  specificites: z.array(z.string()).optional(),

  // Step 4
  documents: z
    .array(
      z.object({
        type: z.string(),
        file: z.instanceof(File).optional(),
        expiryDate: z.string().optional(),
      })
    )
    .optional(),

  // Meta
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CandidatFormData = z.infer<typeof candidatFormSchema>;

/**
 * Valider une étape spécifique
 */
export function validateStep(step: FormStep, data: Partial<CandidatFormData>) {
  switch (step) {
    case "identite":
      return identiteSchema.safeParse(data);
    case "adresse":
      return adresseSchema.safeParse(data);
    case "formation":
      return formationSchema.safeParse(data);
    case "prerequis":
      return prerequisSchema.safeParse(data);
    case "confirmation":
      return candidatFormSchema.safeParse(data);
    default:
      return { success: false, error: new Error("Étape inconnue") };
  }
}

/**
 * Ordre des étapes
 */
export const STEPS: FormStep[] = [
  "identite",
  "adresse",
  "formation",
  "prerequis",
  "confirmation",
];

export const STEP_LABELS: Record<FormStep, string> = {
  identite: "Identité",
  adresse: "Adresse",
  formation: "Formation",
  prerequis: "Prérequis",
  confirmation: "Confirmation",
};

export const STEP_DESCRIPTIONS: Record<FormStep, string> = {
  identite: "Vos coordonnées",
  adresse: "Adresse de résidence",
  formation: "Sélectionner une formation",
  prerequis: "Documents obligatoires",
  confirmation: "Vérifier et soumettre",
};
