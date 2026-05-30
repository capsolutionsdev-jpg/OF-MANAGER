import { z } from "zod";
import { FinancementType } from "@prisma/client";

const optionalText = z.string().trim().optional().or(z.literal(""));

export const publicInscriptionSchema = z.object({
  sessionId: z.string().trim().min(1, "Choisissez une session"),
  nom: z.string().trim().min(1, "Le nom est requis"),
  prenom: z.string().trim().min(1, "Le prénom est requis"),
  email: z.string().trim().email("Email invalide"),
  telephone: optionalText,
  dateNaissance: optionalText,
  ville: optionalText,
  codePostal: optionalText,
  situationPro: optionalText,
  employeur: optionalText,
  financementType: z.nativeEnum(FinancementType).or(z.literal("")).optional(),
  consentement: z.boolean().refine((v) => v === true, {
    message: "Vous devez accepter le traitement de vos données.",
  }),
});

export type PublicInscriptionValues = z.infer<typeof publicInscriptionSchema>;
