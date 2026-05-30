import { z } from "zod";
import { FinancementType, CandidatStatut } from "@prisma/client";

const optionalText = z.string().trim().optional().or(z.literal(""));

export const candidatFormSchema = z.object({
  // Informations personnelles
  nom: z.string().trim().min(1, "Le nom est requis"),
  prenom: z.string().trim().min(1, "Le prénom est requis"),
  email: z.string().trim().email("Email invalide"),
  telephone: optionalText,
  dateNaissance: optionalText, // chaîne "AAAA-MM-JJ" issue de l'input date
  adresse: optionalText,
  ville: optionalText,
  codePostal: optionalText,
  pays: optionalText,
  // Informations professionnelles
  situationPro: optionalText,
  employeur: optionalText,
  posteOccupe: optionalText,
  // Financement & statut
  financementType: z.nativeEnum(FinancementType).or(z.literal("")).optional(),
  statut: z.nativeEnum(CandidatStatut),
});

export type CandidatFormValues = z.infer<typeof candidatFormSchema>;

export const FINANCEMENT_LABELS: Record<FinancementType, string> = {
  CPF: "CPF",
  OPCO: "OPCO",
  FRANCE_TRAVAIL: "France Travail",
  AUTOFINANCEMENT: "Autofinancement",
  ENTREPRISE: "Entreprise",
  AUTRE: "Autre",
};

export const STATUT_LABELS: Record<CandidatStatut, string> = {
  NOUVEAU: "Nouveau",
  EN_TRAITEMENT: "En traitement",
  INSCRIT: "Inscrit",
  REFUSE: "Refusé",
  ARCHIVE: "Archivé",
};
