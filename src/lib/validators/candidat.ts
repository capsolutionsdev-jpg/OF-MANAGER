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
  lieuNaissance: optionalText,
  paysNaissance: optionalText,
  adresse: optionalText,
  ville: optionalText,
  codePostal: optionalText,
  pays: optionalText,
  // Informations professionnelles
  situationPro: optionalText,
  employeur: optionalText,
  posteOccupe: optionalText,
  dernierDiplome: optionalText,
  // Acquisition
  sourceConnaissance: optionalText,
  // Suivi : collaborateur qui suit le dossier
  assignedToId: optionalText,
  // Financement & statut
  financementType: z.nativeEnum(FinancementType).or(z.literal("")).optional(),
  formationSouhaiteeId: optionalText,
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

/** Comment le prospect nous a connus (sert au suivi des sources de trafic). */
export const SOURCE_CONNAISSANCE_OPTIONS = [
  "TikTok",
  "Facebook",
  "Instagram",
  "Google",
  "Mon Compte Formation (CPF)",
  "Bouche à oreille",
  "Recommandation d'un ami",
  "Entreprise partenaire",
  "LinkedIn",
  "Site internet",
  "France Travail",
  "Autre",
] as const;

/** Niveaux / derniers diplômes proposés (avec « Autre » pour saisie libre). */
export const DIPLOME_OPTIONS = [
  "Sans diplôme",
  "Brevet des collèges",
  "CAP / BEP",
  "Baccalauréat",
  "BAC+2 (BTS, DUT, DEUG)",
  "BAC+3 (Licence, Bachelor)",
  "BAC+5 (Master, Ingénieur)",
  "Doctorat",
  "Autre",
] as const;
