import { z } from "zod";
import { FinancementType, InscriptionStatut, PaiementStatut } from "@prisma/client";

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
  SUSPENDUE: "Suspendue",
  ANNULEE: "Annulée",
};

export const PAIEMENT_STATUT_LABELS: Record<PaiementStatut, string> = {
  EN_ATTENTE: "En attente",
  ACOMPTE: "Acompte versé",
  PAYE: "Payé",
  REMBOURSE: "Remboursé",
  ANNULE: "Annulé",
};

/** Modes de paiement proposés (valeur libre stockée en texte). */
export const MODE_PAIEMENT_OPTIONS = [
  "CPF",
  "OPCO",
  "France Travail",
  "Virement",
  "Carte bancaire",
  "Chèque",
  "Espèces",
  "Autofinancement",
  "Entreprise",
  "Autre",
] as const;
