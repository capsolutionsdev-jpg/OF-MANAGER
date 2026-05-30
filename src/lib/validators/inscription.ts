import { z } from "zod";
import { FinancementType, InscriptionStatut } from "@prisma/client";

const optionalText = z.string().trim().optional().or(z.literal(""));

export const inscriptionFormSchema = z.object({
  candidatId: z.string().trim().min(1, "Choisissez un candidat"),
  sessionId: z.string().trim().min(1),
  financementType: z.nativeEnum(FinancementType).or(z.literal("")).optional(),
  statut: z.nativeEnum(InscriptionStatut),
  montant: optionalText,
});

export type InscriptionFormValues = z.infer<typeof inscriptionFormSchema>;

export const INSCRIPTION_STATUT_LABELS: Record<InscriptionStatut, string> = {
  EN_ATTENTE: "En attente",
  VALIDEE: "Validée",
  ANNULEE: "Annulée",
};
