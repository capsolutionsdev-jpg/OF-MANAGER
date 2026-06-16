import { z } from "zod";

export const devisLineSchema = z.object({
  designation: z.string().trim().min(1, "Désignation requise"),
  quantite: z.coerce.number().positive("Quantité > 0"),
  puHT: z.coerce.number().min(0, "Prix ≥ 0"),
});

export const devisFormSchema = z.object({
  entrepriseId: z.string().trim().optional(),
  clientNom: z.string().trim().optional(),
  clientEmail: z.string().trim().optional(),
  objet: z.string().trim().optional(),
  validUntil: z.string().trim().optional(),
  tva: z.coerce.number().min(0).max(100),
  lignes: z.array(devisLineSchema).min(1, "Ajoutez au moins une ligne."),
});

export type DevisFormValues = z.infer<typeof devisFormSchema>;
export type DevisLine = z.infer<typeof devisLineSchema>;
