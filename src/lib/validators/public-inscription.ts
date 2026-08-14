import { z } from "zod";
import { FinancementType } from "@prisma/client";

// Texte optionnel borné (anti-abus : pas de saisie démesurée côté public).
const optionalText = z.string().trim().max(500, "Texte trop long").optional().or(z.literal(""));

export const publicInscriptionSchema = z.object({
  sessionId: z.string().trim().min(1, "Choisissez une session").max(50),
  nom: z.string().trim().min(1, "Le nom est requis").max(120, "Nom trop long (120 max)"),
  prenom: z.string().trim().min(1, "Le prénom est requis").max(120, "Prénom trop long (120 max)"),
  email: z.string().trim().email("Email invalide").max(190, "Email trop long"),
  telephone: optionalText,
  dateNaissance: optionalText,
  ville: optionalText,
  codePostal: optionalText,
  situationPro: optionalText,
  employeur: optionalText,
  financementType: z.nativeEnum(FinancementType).or(z.literal("")).optional(),
  // Prérequis TFP APS : autorisation préalable CNAPS
  cnapsHasCertification: z.boolean().optional(),
  // Prérequis APS-like (MAC APS, Opérateur vidéoprotection, Agent protection rapproché)
  hasCarteProAps: z.boolean().optional(),
  carteProNumero: optionalText,
  carteProValiditeDate: optionalText,
  hasCnapsAuth: z.boolean().optional(),
  cnapsNumero: optionalText,
  cnapsValiditeDate: optionalText,
  // Prérequis transport — formation continue VTC/Taxi : carte pro en cours de validité
  hasCarteProVtcTaxi: z.boolean().optional(),
  carteProVtcTaxiNumero: optionalText,
  carteProVtcTaxiValiditeDate: optionalText,
  // Prérequis transport — passerelle VTC↔Taxi : examen théorique réussi < 3 ans
  examenTheoriqueReussi: z.boolean().optional(),
  examenTheoriqueDate: optionalText,
  consentement: z.boolean().refine((v) => v === true, {
    message: "Vous devez accepter le traitement de vos données.",
  }),
});

export type PublicInscriptionValues = z.infer<typeof publicInscriptionSchema>;
