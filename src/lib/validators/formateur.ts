import { z } from "zod";
import { Academy } from "@prisma/client";

const optionalText = z.string().trim().optional().or(z.literal(""));

export const formateurFormSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est requis"),
  prenom: z.string().trim().min(1, "Le prénom est requis"),
  email: z.string().trim().email("Email invalide").or(z.literal("")).optional(),
  telephone: optionalText,
  specialites: optionalText,
  experienceAnnees: optionalText,
  adresse: optionalText,
  siret: optionalText,
  tarifJournalier: optionalText,
  // Interne (salarié, pas de contrat) ou externe (sous-traitant à contractualiser).
  typeContrat: z.enum(["INTERNE", "EXTERNE"]).optional(),
  academies: z.array(z.nativeEnum(Academy)).optional(),
  formationIds: z.array(z.string()).optional(),
});

export type FormateurFormValues = z.infer<typeof formateurFormSchema>;
