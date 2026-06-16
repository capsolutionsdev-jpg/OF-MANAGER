import { z } from "zod";

/** Modes de règlement proposés à la saisie (alignés avec Inscription.modePaiement). */
export const MODE_PAIEMENT_OPTIONS = [
  "CPF",
  "OPCO",
  "France Travail",
  "Virement",
  "CB",
  "Chèque",
  "Espèces",
  "Autre",
] as const;

export const paiementFormSchema = z.object({
  montant: z.coerce
    .number()
    .positive("Le montant doit être supérieur à 0."),
  mode: z.string().trim().optional(),
  reference: z.string().trim().max(120, "Référence trop longue.").optional(),
});

export type PaiementFormValues = z.infer<typeof paiementFormSchema>;
