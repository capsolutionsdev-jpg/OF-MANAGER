// src/lib/glossaire/terms.ts
// Glossaire SEO/AEO des OF réglementés — SOURCE UNIQUE.
// Chaque terme = une page /glossaire/<slug> (route dynamique) + une entrée d'index.
// `summary` (≤ ~155 car.) sert À LA FOIS la meta description ET la réponse extractible
// en tête de page (bloc que Google/les IA citent). `details` = élaboration courte.
// FAITS uniquement — pas de chiffre inventé.

export const GLOSSAIRE_BASE = "/glossaire";

export type GlossCategory = "qualite" | "of" | "financement" | "securite" | "transport" | "general";

export type GlossTerm = {
  slug: string;
  /** Sigle / libellé court (ce que les gens tapent) — ex. "CPF". */
  term: string;
  /** Forme développée — ex. "Compte Personnel de Formation". */
  fullName: string;
  category: GlossCategory;
  /** Définition courte (≤ ~155 car.) : meta description + réponse en tête de page. */
  summary: string;
  /** Élaboration : 1–2 paragraphes courts. */
  details: string[];
  /** Slugs d'articles /guides liés. */
  relatedGuides?: string[];
  /** Pages solutions/produit liées. */
  relatedSolutions?: { href: string; label: string }[];
  /** Autres termes du glossaire. */
  seeAlso?: string[];
};

export const GLOSSAIRE_CATEGORIES: Record<GlossCategory, { label: string; order: number }> = {
  qualite: { label: "Qualité & Qualiopi", order: 1 },
  of: { label: "Réglementation des OF", order: 2 },
  financement: { label: "Financement", order: 3 },
  securite: { label: "Sécurité privée", order: 4 },
  transport: { label: "Transport VTC / Taxi", order: 5 },
  general: { label: "Général", order: 6 },
};

export const GLOSSAIRE: GlossTerm[] = [
  {
    slug: "qualiopi",
    term: "Qualiopi",
    fullName: "Certification qualité des organismes de formation",
    category: "qualite",
    summary:
      "Certification qualité obligatoire depuis 2022 pour accéder aux fonds publics de la formation (CPF, OPCO…), fondée sur le Référentiel National Qualité.",
    details: [
      "Qualiopi ne certifie pas le contenu des formations mais la qualité des processus de l'organisme. Elle est délivrée par un organisme certificateur accrédité, sur la base de 7 critères et 32 indicateurs, pour un cycle de 3 ans.",
    ],
    relatedGuides: ["certification-qualiopi-guide"],
    relatedSolutions: [{ href: "/solutions/qualiopi", label: "Logiciel Qualiopi" }],
    seeAlso: ["rnq", "bpf", "cpf", "opco"],
  },
  {
    slug: "rnq",
    term: "RNQ",
    fullName: "Référentiel National Qualité",
    category: "qualite",
    summary:
      "Cadre unique de la certification Qualiopi : 7 critères déclinés en 32 indicateurs que doit respecter un organisme de formation.",
    details: [
      "Le RNQ couvre l'information du public, la conception des prestations, l'accompagnement des bénéficiaires, les moyens, les compétences des intervenants et l'amélioration continue. Chaque indicateur applicable doit être prouvé lors de l'audit.",
    ],
    relatedGuides: ["certification-qualiopi-guide"],
    seeAlso: ["qualiopi", "bpf"],
  },
  {
    slug: "cpf",
    term: "CPF",
    fullName: "Compte Personnel de Formation",
    category: "financement",
    summary:
      "Compte, alimenté en euros, dont dispose presque tout actif pour financer une formation certifiante, mobilisable sur Mon Compte Formation.",
    details: [
      "Les droits se cumulent chaque année, dans la limite d'un plafond. Depuis 2024, une participation forfaitaire (de l'ordre de 100 €) reste à la charge du titulaire, sauf pour les demandeurs d'emploi ou en cas de cofinancement.",
      "La formation doit être éligible (certification enregistrée) et dispensée par un organisme certifié Qualiopi.",
    ],
    relatedGuides: ["financer-formation-cpf-opco-france-travail"],
    seeAlso: ["opco", "rncp", "rs"],
  },
  {
    slug: "opco",
    term: "OPCO",
    fullName: "Opérateur de compétences",
    category: "financement",
    summary:
      "Organisme agréé qui finance la formation des salariés des entreprises de sa branche (surtout TPE-PME) et l'alternance. Onze OPCO en France.",
    details: [
      "L'OPCO est la voie « employeur » du financement : l'entreprise le sollicite pour prendre en charge le plan de développement des compétences de ses salariés.",
    ],
    relatedGuides: ["financer-formation-cpf-opco-france-travail"],
    seeAlso: ["cpf", "ptp"],
  },
  {
    slug: "ptp",
    term: "PTP",
    fullName: "Projet de Transition Professionnelle",
    category: "financement",
    summary:
      "Dispositif (ex-CIF) permettant à un salarié de suivre une formation certifiante pour une reconversion, géré par les associations Transitions Pro.",
    details: [
      "Le PTP peut financer la formation et maintenir la rémunération du salarié pendant son absence.",
    ],
    relatedGuides: ["financer-formation-cpf-opco-france-travail"],
    seeAlso: ["cpf", "opco"],
  },
  {
    slug: "nda",
    term: "NDA",
    fullName: "Numéro de Déclaration d'Activité",
    category: "of",
    summary:
      "Identifiant à 11 chiffres attribué par la DREETS à un organisme de formation déclaré. Ce n'est ni un agrément ni un label qualité.",
    details: [
      "Le NDA autorise l'exercice de l'activité de formation mais n'ouvre pas droit aux financements publics (rôle réservé à Qualiopi). Il devient caduc en l'absence d'activité déclarée deux années consécutives.",
    ],
    relatedGuides: ["ouvrir-organisme-de-formation"],
    seeAlso: ["dreets", "bpf", "qualiopi"],
  },
  {
    slug: "bpf",
    term: "BPF",
    fullName: "Bilan Pédagogique et Financier",
    category: "of",
    summary:
      "Déclaration annuelle, à transmettre avant le 31 mai, par laquelle un organisme de formation retrace son activité et ses financements.",
    details: [
      "Le BPF est obligatoire même en l'absence d'activité. Deux années consécutives sans activité déclarée rendent la déclaration d'activité (NDA) caduque.",
    ],
    relatedGuides: ["ouvrir-organisme-de-formation"],
    seeAlso: ["nda", "dreets"],
  },
  {
    slug: "rncp",
    term: "RNCP",
    fullName: "Répertoire National des Certifications Professionnelles",
    category: "of",
    summary:
      "Répertoire officiel, géré par France compétences, des certifications professionnelles (titres, diplômes) reconnues par l'État.",
    details: [
      "Une certification enregistrée au RNCP atteste d'un niveau de qualification et rend, en général, la formation correspondante éligible au CPF.",
    ],
    seeAlso: ["rs", "cpf"],
  },
  {
    slug: "rs",
    term: "RS",
    fullName: "Répertoire spécifique",
    category: "of",
    summary:
      "Répertoire, géré par France compétences, des certifications et habilitations correspondant à des compétences complémentaires à un métier.",
    details: [
      "Comme le RNCP, une inscription au Répertoire spécifique conditionne souvent l'éligibilité de la formation au CPF. On y trouve par exemple des habilitations réglementaires ou les préparations aux examens VTC et taxi.",
    ],
    seeAlso: ["rncp", "cpf"],
  },
  {
    slug: "dreets",
    term: "DREETS",
    fullName: "Direction régionale de l'économie, de l'emploi, du travail et des solidarités",
    category: "of",
    summary:
      "Service déconcentré de l'État, au niveau régional, auprès duquel un organisme de formation dépose sa déclaration d'activité.",
    details: [
      "C'est la DREETS qui attribue le numéro de déclaration d'activité (NDA) et instruit les démarches administratives des organismes de formation.",
    ],
    relatedGuides: ["ouvrir-organisme-de-formation"],
    seeAlso: ["nda", "bpf"],
  },
  {
    slug: "cnaps",
    term: "CNAPS",
    fullName: "Conseil National des Activités Privées de Sécurité",
    category: "securite",
    summary:
      "Organisme public qui encadre et contrôle la sécurité privée en France : cartes professionnelles, autorisations, respect du cadre légal.",
    details: [
      "Le CNAPS délivre l'autorisation préalable d'entrée en formation et la carte professionnelle, indispensables pour exercer un métier de la sécurité privée.",
    ],
    relatedGuides: ["devenir-agent-de-securite-privee"],
    relatedSolutions: [{ href: "/solutions/tfp-aps", label: "Formations TFP APS" }],
    seeAlso: ["tfp-aps", "ssiap", "mac-aps"],
  },
  {
    slug: "tfp-aps",
    term: "TFP APS",
    fullName: "Titre à Finalité Professionnelle Agent de Prévention et de Sécurité",
    category: "securite",
    summary:
      "Qualification de base (environ 175 h) pour exercer comme agent de sécurité privée, donnant accès à la carte professionnelle du CNAPS.",
    details: [
      "Le TFP APS a remplacé l'ancien CQP APS. Il est éligible au CPF et constitue le socle avant d'éventuelles spécialisations (SSIAP, cynophile, sûreté aéroportuaire…).",
    ],
    relatedGuides: ["devenir-agent-de-securite-privee"],
    relatedSolutions: [{ href: "/solutions/tfp-aps", label: "Logiciel TFP APS" }],
    seeAlso: ["cnaps", "mac-aps", "ssiap"],
  },
  {
    slug: "ssiap",
    term: "SSIAP",
    fullName: "Service de Sécurité Incendie et d'Assistance à Personnes",
    category: "securite",
    summary:
      "Qualification des agents de sécurité incendie dans les ERP et IGH, organisée en trois niveaux (SSIAP 1, 2 et 3).",
    details: [
      "SSIAP 1 forme l'agent, SSIAP 2 le chef d'équipe, SSIAP 3 le chef de service sécurité incendie. Chaque niveau a sa formation et son recyclage.",
    ],
    relatedSolutions: [{ href: "/solutions/ssiap", label: "Logiciel SSIAP" }],
    seeAlso: ["tfp-aps", "cnaps", "mac-aps"],
  },
  {
    slug: "mac-aps",
    term: "MAC APS",
    fullName: "Maintien et Actualisation des Compétences (APS)",
    category: "securite",
    summary:
      "Recyclage obligatoire des agents de sécurité privée, à suivre avant l'échéance des 5 ans de la carte professionnelle pour la renouveler.",
    details: [
      "Le MAC APS remet à niveau le cadre légal, le secourisme et les gestes métier. Sans lui, la carte professionnelle ne peut être renouvelée.",
    ],
    relatedGuides: ["devenir-agent-de-securite-privee"],
    seeAlso: ["tfp-aps", "cnaps"],
  },
  {
    slug: "t3p",
    term: "T3P",
    fullName: "Transport public particulier de personnes",
    category: "transport",
    summary:
      "Cadre réglementaire commun aux VTC, taxis et véhicules motorisés à 2 ou 3 roues assurant le transport de personnes à titre onéreux.",
    details: [
      "Le T3P définit les conditions d'accès (examen, carte professionnelle) et les obligations des conducteurs. L'examen est organisé par les Chambres de Métiers et de l'Artisanat.",
    ],
    relatedGuides: ["devenir-chauffeur-vtc-taxi"],
    relatedSolutions: [{ href: "/solutions/vtc-taxi", label: "Logiciel VTC / Taxi" }],
    seeAlso: ["ads"],
  },
  {
    slug: "ads",
    term: "ADS",
    fullName: "Autorisation De Stationnement",
    category: "transport",
    summary:
      "« Licence de taxi » délivrée par la commune, permettant de stationner et de prendre des clients sur la voie publique. Propre au taxi.",
    details: [
      "L'ADS distingue le taxi du VTC, qui travaille uniquement sur réservation préalable. Un conducteur peut détenir sa propre ADS, en être locataire, ou être salarié d'un titulaire.",
    ],
    relatedGuides: ["devenir-chauffeur-vtc-taxi"],
    seeAlso: ["t3p"],
  },
  {
    slug: "eidas",
    term: "eIDAS",
    fullName: "Signature électronique eIDAS",
    category: "general",
    summary:
      "Règlement européen encadrant la signature électronique : une signature conforme a la même valeur juridique qu'une signature manuscrite.",
    details: [
      "Avec horodatage et traçabilité, la signature eIDAS sécurise les conventions et émargements d'un organisme de formation — une preuve précieuse le jour de l'audit Qualiopi.",
    ],
    relatedSolutions: [{ href: "/fonctionnalites", label: "Fonctionnalités OFManager" }],
    seeAlso: ["qualiopi"],
  },
];

export function getTerm(slug: string): GlossTerm | undefined {
  return GLOSSAIRE.find((t) => t.slug === slug);
}

/** Termes triés alphabétiquement par sigle (pour l'index A→Z). */
export function termsSorted(): GlossTerm[] {
  return [...GLOSSAIRE].sort((a, b) => a.term.localeCompare(b.term, "fr"));
}

/** Termes groupés par catégorie (ordre défini dans GLOSSAIRE_CATEGORIES). */
export function termsByCategory(): { key: GlossCategory; label: string; terms: GlossTerm[] }[] {
  return (Object.keys(GLOSSAIRE_CATEGORIES) as GlossCategory[])
    .sort((a, b) => GLOSSAIRE_CATEGORIES[a].order - GLOSSAIRE_CATEGORIES[b].order)
    .map((key) => ({
      key,
      label: GLOSSAIRE_CATEGORIES[key].label,
      terms: termsSorted().filter((t) => t.category === key),
    }))
    .filter((g) => g.terms.length > 0);
}
