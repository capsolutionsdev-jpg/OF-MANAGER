import { QualiopiStatut } from "@prisma/client";

// Les 7 critères du Référentiel National Qualité (RNQ).
export const CRITERES: Record<number, string> = {
  1: "Critère 1 — Information du public",
  2: "Critère 2 — Identification des objectifs et adaptation des prestations",
  3: "Critère 3 — Accueil, accompagnement, suivi et évaluation des publics",
  4: "Critère 4 — Moyens pédagogiques, techniques et d'encadrement",
  5: "Critère 5 — Qualification et développement des compétences des personnels",
  6: "Critère 6 — Inscription dans l'environnement professionnel",
  7: "Critère 7 — Recueil et prise en compte des appréciations et réclamations",
};

// Les 32 indicateurs du RNQ — numérotation RNQ 2024 (critère 4 : 17-20,
// critère 5 : 21-22, critère 6 : 23-29). Libellés synthétiques : à valider contre
// le texte officiel du certificateur (cf. audit QLP-02).
export const INDICATEURS: { numero: number; critere: number; libelle: string }[] = [
  { numero: 1, critere: 1, libelle: "Diffusion d'une information accessible, détaillée et vérifiable sur les prestations proposées." },
  { numero: 2, critere: 1, libelle: "Diffusion d'indicateurs de résultats adaptés à la nature des prestations et des publics." },
  { numero: 3, critere: 1, libelle: "Diffusion des taux d'obtention, de poursuite d'études et d'insertion (certifications / apprentissage)." },
  { numero: 4, critere: 2, libelle: "Analyse du besoin du bénéficiaire en lien avec l'entreprise et/ou le financeur." },
  { numero: 5, critere: 2, libelle: "Définition des objectifs opérationnels et évaluables de la prestation." },
  { numero: 6, critere: 2, libelle: "Établissement des contenus et modalités de mise en œuvre adaptés aux objectifs et aux publics." },
  { numero: 7, critere: 2, libelle: "Adéquation du ou des contenus de la prestation aux exigences de la certification visée." },
  { numero: 8, critere: 2, libelle: "Information sur les conditions de présentation aux épreuves d'évaluation (apprentissage)." },
  { numero: 9, critere: 3, libelle: "Information des publics sur les conditions de déroulement (positionnement, accès, contacts, délais)." },
  { numero: 10, critere: 3, libelle: "Adaptation de la prestation, de l'accompagnement et du suivi aux publics bénéficiaires." },
  { numero: 11, critere: 3, libelle: "Évaluation de l'atteinte des objectifs par les bénéficiaires." },
  { numero: 12, critere: 3, libelle: "Mesures pour favoriser l'engagement des bénéficiaires et prévenir les ruptures de parcours." },
  { numero: 13, critere: 3, libelle: "Coordination avec l'entreprise pour faciliter l'alternance (apprentissage)." },
  { numero: 14, critere: 3, libelle: "Exercice par l'apprenti de ses droits et devoirs en tant qu'alternant (apprentissage)." },
  { numero: 15, critere: 3, libelle: "Mise en œuvre et adaptation de la prestation en cas d'aléa (apprentissage)." },
  { numero: 16, critere: 3, libelle: "Conditions de présentation des certifications (information sur les blocs / équivalences)." },
  { numero: 17, critere: 4, libelle: "Mobilisation de moyens humains et techniques adaptés et coordination des intervenants." },
  { numero: 18, critere: 4, libelle: "Mise à disposition de ressources pédagogiques et appropriation par les bénéficiaires." },
  { numero: 19, critere: 4, libelle: "Mobilisation des personnels pour l'accompagnement socio-professionnel (apprentissage)." },
  { numero: 20, critere: 4, libelle: "Information sur les aides (financières, mobilité, hébergement, restauration…) (apprentissage)." },
  { numero: 21, critere: 5, libelle: "Compétences des formateurs et intervenants requises et entretenues." },
  { numero: 22, critere: 5, libelle: "Gestion des compétences de l'équipe : recrutement, intégration, développement." },
  { numero: 23, critere: 6, libelle: "Veille légale et réglementaire du champ de la formation et mise en œuvre." },
  { numero: 24, critere: 6, libelle: "Veille sur les évolutions des compétences, des métiers et des emplois du secteur." },
  { numero: 25, critere: 6, libelle: "Veille sur les innovations pédagogiques et technologiques et mise en œuvre." },
  { numero: 26, critere: 6, libelle: "Mise en œuvre de modalités d'accueil et d'accompagnement des personnes en situation de handicap." },
  { numero: 27, critere: 6, libelle: "Mobilisation d'un réseau de partenaires socio-économiques (et de la sous-traitance / co-traitance)." },
  { numero: 28, critere: 6, libelle: "Actions favorisant l'insertion ou la poursuite d'études (apprentissage)." },
  { numero: 29, critere: 6, libelle: "Suivi du devenir professionnel des bénéficiaires à l'issue de la prestation." },
  { numero: 30, critere: 7, libelle: "Recueil des appréciations des parties prenantes (bénéficiaires, entreprises, financeurs, formateurs)." },
  { numero: 31, critere: 7, libelle: "Traitement des réclamations, des difficultés et des aléas rencontrés." },
  { numero: 32, critere: 7, libelle: "Mise en œuvre de mesures d'amélioration continue à partir des retours et dysfonctionnements." },
];

export const QUALIOPI_STATUT_LABELS: Record<QualiopiStatut, string> = {
  CONFORME: "Conforme",
  NON_CONFORME: "Non conforme",
  EN_COURS: "En cours",
  NON_APPLICABLE: "Non applicable",
};

export const QUALIOPI_STATUT_BADGE: Record<QualiopiStatut, string> = {
  CONFORME: "bg-emerald-100 text-emerald-700",
  NON_CONFORME: "bg-red-100 text-red-700",
  EN_COURS: "bg-amber-100 text-amber-700",
  NON_APPLICABLE: "bg-muted text-muted-foreground",
};
