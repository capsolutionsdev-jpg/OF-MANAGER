// =============================================================
//  SIMULATEUR DE FINANCEMENT — base de connaissances.
//  Dispositifs de financement de la formation professionnelle (secteur
//  privé), leur éligibilité par profil de prospect, leur procédure de
//  montage et le dossier administratif (pièces) requis.
//  Source : book « FINANCEMENTS — méthode TenSteps » + cadre réglementaire
//  (loi du 5/09/2018). À jour des dispositifs : CPF, OPCO (PDC, Pro-A,
//  PCRH, FNE), PTP, FAF (FIFPL, AGEFICE, FAFCEA, VIVEA), France Travail
//  (AIF, POE), AGEFIPH. Données indicatives — vérifier auprès du financeur.
// =============================================================

/** Statut professionnel du prospect (détermine les droits accessibles). */
export type StatutProspect =
  | "salarie_prive" // salarié du secteur privé (CDI/CDD)
  | "alternant" // apprenti / contrat de professionnalisation
  | "independant_tns" // indépendant / travailleur non salarié
  | "dirigeant_tpe" // dirigeant de TPE (peut être assimilé salarié ou TNS)
  | "demandeur_emploi" // inscrit à France Travail
  | "agent_public"; // agent de la fonction publique

export const STATUT_LABELS: Record<StatutProspect, string> = {
  salarie_prive: "Salarié du privé (CDI / CDD)",
  alternant: "Alternant (apprentissage / pro)",
  independant_tns: "Indépendant / Travailleur non salarié (TNS)",
  dirigeant_tpe: "Dirigeant de TPE",
  demandeur_emploi: "Demandeur d'emploi",
  agent_public: "Agent public / fonctionnaire",
};

/** Secteur d'activité d'un indépendant — route vers le bon FAF. */
export type Activite =
  | "liberal" // profession libérale (réglementée ou non) → FIF-PL
  | "commercant" // commerçant / dirigeant non salarié → AGEFICE
  | "artisan" // artisan (Répertoire des Métiers) → FAFCEA
  | "agricole"; // exploitant agricole → VIVEA

export const ACTIVITE_LABELS: Record<Activite, string> = {
  liberal: "Profession libérale",
  commercant: "Commerçant / dirigeant non salarié",
  artisan: "Artisan",
  agricole: "Exploitant agricole",
};

/** Profil saisi dans le simulateur. */
export type ProfilFinancement = {
  statut: StatutProspect;
  /** Indépendant : en micro-entreprise / auto-entreprise ? */
  microEntreprise?: boolean;
  /** Indépendant : secteur d'activité (route FAF). */
  activite?: Activite;
  /** Taille de l'entreprise (pour les salariés / dirigeants). */
  tailleEntreprise?: "tpe" | "pme" | "eti_ge";
  /** Projet de reconversion (changement de métier) → PTP. */
  reconversion?: boolean;
  /** Bénéficiaire de l'obligation d'emploi (RQTH) → AGEFIPH. */
  handicap?: boolean;
};

export type NiveauEligibilite = "prioritaire" | "eligible" | "conditions";

export const NIVEAU_LABELS: Record<NiveauEligibilite, string> = {
  prioritaire: "À activer en priorité",
  eligible: "Éligible",
  conditions: "Sous conditions",
};

export type Dispositif = {
  id: string;
  nom: string;
  sigle: string;
  operateur: string;
  resume: string;
  conditions: string[];
  priseEnCharge: string;
  delais: string;
  /** Étapes de montage du financement. */
  procedure: string[];
  /** Pièces du dossier administratif. */
  dossier: string[];
};

/** Catalogue des dispositifs (procédure + dossier administratif). */
export const DISPOSITIFS: Record<string, Dispositif> = {
  cpf: {
    id: "cpf",
    nom: "Compte Personnel de Formation",
    sigle: "CPF",
    operateur: "Caisse des Dépôts — Mon Compte Formation",
    resume:
      "Droits personnels de formation (≈ 500 €/an, plafonnés à 5 000 €) mobilisables par tout actif, salarié comme indépendant.",
    conditions: [
      "Disposer de droits CPF crédités (compte alimenté par l'activité)",
      "Formation certifiante éligible (inscrite au RNCP ou au Répertoire Spécifique)",
      "Participation forfaitaire du titulaire (~100 €, sauf abondement employeur ou demandeur d'emploi)",
    ],
    priseEnCharge:
      "Dans la limite des droits acquis ; abondements possibles (employeur, OPCO, Région, France Travail) pour couvrir le reste à charge.",
    delais: "Inscription en ligne ; entrée en formation au minimum 11 jours ouvrés après accord.",
    procedure: [
      "Le bénéficiaire active son compte sur moncompteformation.gouv.fr (via FranceConnect+)",
      "Vérifier le solde de droits disponibles",
      "Rechercher la formation (référencée et éligible) et s'inscrire",
      "Valider la demande et régler la participation forfaitaire / le reste à charge",
      "Mobiliser un abondement si nécessaire (employeur / OPCO / Région)",
    ],
    dossier: [
      "Pièce d'identité + compte FranceConnect+ (identité vérifiée)",
      "Attestation de droits CPF (capture du solde)",
      "Programme et devis de la formation (fournis par l'OF, formation référencée)",
      "RIB du titulaire (pour la participation / le remboursement éventuel)",
    ],
  },
  opco_pdc: {
    id: "opco_pdc",
    nom: "Plan de Développement des Compétences",
    sigle: "OPCO – PDC",
    operateur: "OPCO de la branche (11 opérateurs)",
    resume:
      "Financement par l'OPCO des formations des salariés, à l'initiative de l'employeur. Enveloppe mutualisée prioritaire pour les TPE-PME (< 50 salariés).",
    conditions: [
      "Entreprise du privé cotisante, rattachée à un OPCO (selon l'IDCC / la branche)",
      "Formation réalisée par un OF déclaré et certifié Qualiopi",
      "Demande déposée AVANT le début de la formation ; accord de l'employeur",
    ],
    priseEnCharge:
      "Coûts pédagogiques (et parfois salaires / frais annexes) selon les plafonds de l'OPCO (par heure ou par jour), bonifiés pour les TPE.",
    delais: "Dépôt avant démarrage ; instruction 2 à 3 semaines. Budgets annuels limités (peuvent s'épuiser).",
    procedure: [
      "Identifier l'OPCO de l'entreprise (via l'IDCC du bulletin de paie ou le SIRET / code NAF)",
      "Vérifier les conditions et plafonds de prise en charge sur le portail de l'OPCO",
      "Établir le devis et le programme détaillé",
      "Déposer la demande de prise en charge sur le portail OPCO AVANT le démarrage",
      "Obtenir l'accord, réaliser la formation, puis facturer (subrogation possible)",
    ],
    dossier: [
      "Devis et programme détaillé (objectifs, durée, dates, modalités)",
      "Convention de formation",
      "Attestation Qualiopi + n° de déclaration d'activité (NDA) de l'OF",
      "KBIS / SIRET de l'entreprise et IDCC (convention collective)",
      "Justificatif de rattachement du salarié (bulletin de salaire)",
      "Feuilles d'émargement / attestation d'assiduité + facture (en fin de formation)",
      "RIB de l'OF",
    ],
  },
  opco_proa: {
    id: "opco_proa",
    nom: "Promotion par l'alternance",
    sigle: "Pro-A",
    operateur: "OPCO de la branche",
    resume:
      "Reconversion ou montée en qualification d'un salarié en poste, par l'alternance, vers une certification visée par un accord de branche.",
    conditions: [
      "Salarié en CDI (ou CDD/CUI sous conditions) dont la qualification est inférieure à la licence",
      "Certification visée inscrite au RNCP et listée par un accord de branche étendu",
      "Formation en alternance (avenant au contrat de travail)",
    ],
    priseEnCharge: "Coûts pédagogiques (forfait horaire de branche), parfois une partie de la rémunération.",
    delais: "Avant démarrage de l'alternance.",
    procedure: [
      "Vérifier que la certification est éligible dans l'accord de branche",
      "Établir un avenant au contrat de travail (mention Pro-A, durée)",
      "Déposer la demande de prise en charge auprès de l'OPCO",
      "Réaliser le parcours en alternance",
    ],
    dossier: [
      "Avenant au contrat de travail (Pro-A)",
      "Programme et calendrier d'alternance",
      "Référence de la certification visée (RNCP)",
      "Devis + attestation Qualiopi de l'OF",
      "Justificatif du niveau de qualification du salarié",
    ],
  },
  opco_pcrh: {
    id: "opco_pcrh",
    nom: "Prestation de Conseil en Ressources Humaines",
    sigle: "PCRH",
    operateur: "OPCO",
    resume:
      "Accompagnement RH cofinancé pour les TPE-PME (< 250 salariés), en amont d'un plan de montée en compétences.",
    conditions: [
      "Entreprise de moins de 250 salariés",
      "Prestation de conseil RH réalisée par un prestataire référencé",
    ],
    priseEnCharge: "Prise en charge partielle ou totale selon l'OPCO (plafond de jours).",
    delais: "Avant démarrage de la prestation.",
    procedure: [
      "Rapprocher l'entreprise de son conseiller OPCO",
      "Cadrer la prestation (diagnostic RH, plan d'action)",
      "Déposer la demande de prise en charge PCRH",
    ],
    dossier: [
      "Devis et proposition d'intervention",
      "SIRET / effectif de l'entreprise",
      "Attestation Qualiopi du prestataire",
    ],
  },
  fne: {
    id: "fne",
    nom: "FNE-Formation",
    sigle: "FNE",
    operateur: "État (via l'OPCO / la DREETS)",
    resume:
      "Aide de l'État pour former les salariés d'entreprises en mutation économique, transition écologique ou numérique.",
    conditions: [
      "Entreprise concernée par une mutation / transition (selon appels en cours)",
      "Formation des salariés via une convention OPCO/DREETS",
    ],
    priseEnCharge: "Cofinancement État des coûts pédagogiques (taux variable selon l'appel).",
    delais: "Selon les conventions et appels à projets en cours.",
    procedure: [
      "Vérifier l'éligibilité de l'entreprise auprès de l'OPCO",
      "Construire le projet de formation collectif",
      "Conventionner avec l'OPCO / la DREETS",
    ],
    dossier: [
      "Diagnostic / justificatif de la situation de l'entreprise",
      "Programme et devis des formations",
      "Convention FNE",
      "Attestation Qualiopi de l'OF",
    ],
  },
  ptp: {
    id: "ptp",
    nom: "Projet de Transition Professionnelle (CPF de transition)",
    sigle: "PTP",
    operateur: "Transitions Pro (CPIR régionale, ex-Fongecif)",
    resume:
      "Permet à un salarié de se former à un nouveau métier tout en conservant sa rémunération. Levier majeur pour la reconversion.",
    conditions: [
      "Salarié en CDI (ancienneté de 24 mois dont 12 dans l'entreprise) ou CDD sous conditions",
      "Projet de changement de métier (condition sine qua non)",
      "Formation certifiante (RNCP) ; autorisation d'absence de l'employeur",
    ],
    priseEnCharge: "Frais pédagogiques + maintien de la rémunération (sans mobiliser l'épargne du salarié).",
    delais: "Dépôt 2 à 4 mois avant ; instruction et passage en commission de la CPIR.",
    procedure: [
      "Confirmer que le projet est bien une reconversion (changement de métier)",
      "Demander l'autorisation d'absence à l'employeur",
      "Réaliser un positionnement préalable avec l'OF",
      "Monter le dossier sur le site de Transitions Pro de la région",
      "Passage en commission → financement",
    ],
    dossier: [
      "Dossier Transitions Pro (formulaire régional)",
      "Justificatif d'ancienneté / contrat de travail",
      "Devis, programme et calendrier de la formation",
      "Référence de la certification (RNCP)",
      "Demande d'autorisation d'absence signée",
      "Résultat du positionnement préalable",
    ],
  },
  fifpl: {
    id: "fifpl",
    nom: "Fonds Interprofessionnel de Formation des Professionnels Libéraux",
    sigle: "FAF – FIF-PL",
    operateur: "FIF-PL",
    resume:
      "FAF des professions libérales : finance la formation des libéraux à jour de leur Contribution à la Formation Professionnelle (CFP).",
    conditions: [
      "Profession libérale immatriculée (code APE libéral)",
      "Être à jour de la CFP versée à l'URSSAF",
      "Formation relevant des critères / du catalogue annuel du FIF-PL (plafond annuel)",
    ],
    priseEnCharge: "Forfait par jour / par thème, dans la limite d'un plafond annuel par bénéficiaire.",
    delais: "Demande à déposer avant la formation (dans les délais publiés par le FIF-PL).",
    procedure: [
      "Créer un compte sur fifpl.fr",
      "Déposer la demande de prise en charge avant la formation",
      "Joindre les justificatifs (CFP, devis, programme)",
      "Obtenir l'accord, réaliser la formation",
      "Demander le remboursement avec l'attestation de présence et la facture",
    ],
    dossier: [
      "Attestation URSSAF de versement de la CFP",
      "Justificatif d'immatriculation (SIRET / code APE)",
      "Devis, programme et dates de la formation",
      "Attestation de présence (après la formation) + facture acquittée",
      "Attestation Qualiopi de l'OF + RIB du bénéficiaire",
    ],
  },
  agefice: {
    id: "agefice",
    nom: "Association de Gestion du Financement de la Formation des Chefs d'Entreprise",
    sigle: "FAF – AGEFICE",
    operateur: "AGEFICE (points d'accueil / Mallette du Dirigeant)",
    resume:
      "FAF des dirigeants non salariés du commerce, de l'industrie et des services. Crédit annuel de formation par dirigeant.",
    conditions: [
      "Travailleur non salarié ressortissant de l'AGEFICE (commerçant, dirigeant non salarié)",
      "Être à jour de la CFP versée à l'URSSAF",
      "Crédit annuel disponible (selon thématiques prioritaires)",
    ],
    priseEnCharge: "Crédit annuel forfaitaire par dirigeant (plafonds par thème), souvent via la Mallette du Dirigeant.",
    delais: "Demande de prise en charge avant la formation.",
    procedure: [
      "Créer un compte sur la plateforme AGEFICE (ou via un point d'accueil)",
      "Déposer la demande de prise en charge avant la formation",
      "Obtenir l'accord, réaliser la formation",
      "Transmettre les justificatifs pour remboursement",
    ],
    dossier: [
      "Attestation de versement de la CFP (URSSAF)",
      "Extrait RCS / KBIS ou avis de situation SIRENE",
      "Devis et programme de la formation",
      "Attestation de présence + facture",
      "RIB + attestation Qualiopi de l'OF",
    ],
  },
  fafcea: {
    id: "fafcea",
    nom: "Fonds d'Assurance Formation des Chefs d'Entreprise Artisanale",
    sigle: "FAF – FAFCEA",
    operateur: "FAFCEA (et Conseils de la formation des CMA)",
    resume:
      "FAF des artisans : finance les formations techniques (métier) et transverses des chefs d'entreprise artisanale.",
    conditions: [
      "Artisan immatriculé au Répertoire des Métiers (ou registre unique)",
      "Être à jour de la CFP artisanale",
      "Formation éligible (technique / transverse selon les critères annuels)",
    ],
    priseEnCharge: "Forfait horaire dans la limite d'un plafond annuel.",
    delais: "Demande avant la formation.",
    procedure: [
      "Identifier le bon fonds (FAFCEA pour le technique, Conseil de la formation / CMA pour le transverse)",
      "Déposer la demande de prise en charge avant la formation",
      "Réaliser la formation, puis demander le remboursement",
    ],
    dossier: [
      "Attestation de versement de la CFP",
      "Extrait d'immatriculation au Répertoire des Métiers",
      "Devis, programme et dates",
      "Attestation de présence + facture",
      "RIB + attestation Qualiopi de l'OF",
    ],
  },
  vivea: {
    id: "vivea",
    nom: "Fonds pour la formation des entrepreneurs du vivant",
    sigle: "FAF – VIVEA",
    operateur: "VIVEA",
    resume:
      "FAF des chefs d'exploitation et entrepreneurs agricoles, contributeurs via la MSA.",
    conditions: [
      "Contribuer à VIVEA (cotisation via la MSA)",
      "Formation éligible, dans la limite du plafond annuel (crédit par contributeur)",
    ],
    priseEnCharge: "Prise en charge des coûts pédagogiques dans la limite d'un plafond annuel.",
    delais: "Demande avant la formation.",
    procedure: [
      "Vérifier ses droits sur l'espace VIVEA",
      "S'inscrire à une formation référencée VIVEA",
      "L'OF dépose la demande de financement",
    ],
    dossier: [
      "Justificatif de contribution VIVEA (MSA)",
      "Programme et dates de la formation",
      "Attestation de présence",
      "Attestation Qualiopi de l'OF",
    ],
  },
  ft_aif: {
    id: "ft_aif",
    nom: "Aide Individuelle à la Formation",
    sigle: "France Travail – AIF",
    operateur: "France Travail",
    resume:
      "Financement par France Travail du coût pédagogique de la formation d'un demandeur d'emploi, en complément éventuel du CPF.",
    conditions: [
      "Être inscrit comme demandeur d'emploi avec un conseiller référent",
      "Projet de formation validé dans le cadre du Projet Personnalisé d'Accès à l'Emploi (PPAE)",
      "Formation non couverte par un autre dispositif collectif",
    ],
    priseEnCharge: "Coût pédagogique (cumulable avec le CPF et les droits acquis).",
    delais: "Instruction par le conseiller (quelques jours à 2 semaines). Devis à déposer avant le démarrage.",
    procedure: [
      "Valider le projet de formation avec le conseiller référent",
      "L'OF établit un devis France Travail (formulaire AIF)",
      "Saisie de la demande sur l'espace France Travail (KAIROS pour l'OF)",
      "Instruction et accord du conseiller, puis entrée en formation",
    ],
    dossier: [
      "Devis France Travail (formulaire AIF) renseigné par l'OF",
      "Programme de la formation + attestation Qualiopi",
      "Validation du projet par le conseiller (PPAE)",
      "Attestation d'inscription France Travail du bénéficiaire",
      "RIB de l'OF",
    ],
  },
  ft_poe: {
    id: "ft_poe",
    nom: "Préparation Opérationnelle à l'Emploi (POEI / POEC)",
    sigle: "France Travail – POE",
    operateur: "France Travail (POEC avec l'OPCO)",
    resume:
      "Formation préalable au recrutement pour combler l'écart entre les compétences du demandeur d'emploi et un poste à pourvoir.",
    conditions: [
      "POEI : une entreprise est prête à recruter (promesse d'embauche)",
      "POEC : besoin de recrutement d'une branche (action collective)",
      "Demandeur d'emploi inscrit à France Travail",
    ],
    priseEnCharge: "Coût pédagogique (France Travail et/ou OPCO) ; la formation précède l'embauche.",
    delais: "Avant l'embauche prévue.",
    procedure: [
      "Identifier l'entreprise recruteuse (POEI) ou l'action de branche (POEC)",
      "Construire le plan de formation préalable au poste",
      "Déposer la demande auprès de France Travail / de l'OPCO",
    ],
    dossier: [
      "Formulaire POE",
      "Promesse d'embauche / engagement de l'employeur (POEI)",
      "Programme et devis de la formation",
      "Attestation Qualiopi de l'OF",
    ],
  },
  agefiph: {
    id: "agefiph",
    nom: "Aide de l'AGEFIPH à la formation",
    sigle: "AGEFIPH",
    operateur: "AGEFIPH",
    resume:
      "Aide complémentaire à la formation des personnes en situation de handicap (RQTH), quel que soit leur statut.",
    conditions: [
      "Bénéficiaire de l'obligation d'emploi (RQTH / BOETH)",
      "En complément des autres dispositifs (CPF, OPCO, France Travail…)",
    ],
    priseEnCharge: "Aide complémentaire au financement de la formation (montant selon le projet).",
    delais: "Avant le démarrage, en lien avec le référent handicap / Cap emploi.",
    procedure: [
      "Justifier de la RQTH",
      "Construire le projet avec le conseiller (France Travail / Cap emploi)",
      "Déposer la demande d'aide AGEFIPH",
    ],
    dossier: [
      "Justificatif de RQTH / BOETH",
      "Devis et programme de la formation",
      "Formulaire de demande AGEFIPH",
    ],
  },
  autofinancement: {
    id: "autofinancement",
    nom: "Financement personnel",
    sigle: "Autofinancement",
    operateur: "Le bénéficiaire",
    resume:
      "Toujours possible, en dernier recours ou en complément. Des facilités de paiement peuvent être proposées.",
    conditions: ["Aucune condition d'éligibilité"],
    priseEnCharge: "À la charge du bénéficiaire (reste à charge après mobilisation des dispositifs).",
    delais: "Immédiat.",
    procedure: [
      "Présenter un devis clair (coût total - financements mobilisés = reste à charge)",
      "Proposer un échéancier / des facilités de paiement",
    ],
    dossier: ["Devis et convention de formation", "RIB / mandat de prélèvement éventuel"],
  },
};
