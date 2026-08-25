// src/lib/comparatif/data.ts
// Données des pages comparatives — SOURCE UNIQUE (principe du skill « competitors »).
//
// RÈGLES (loi FR sur la pub comparative, art. L122-1 : exacte, objective, vérifiable,
// non dénigrante) :
//  - AUCUN fait concurrent inventé. Chaque profil renvoie à la SOURCE (site de l'éditeur).
//  - On reconnaît honnêtement les forces du concurrent (`forces`, `bestFor`, ligne maturité).
//  - Les colonnes du tableau reflètent les fonctionnalités PUBLIÉES par les éditeurs
//    (état daté ci-dessous) — pas des affirmations négatives non vérifiables.
//  - À FAIRE VALIDER par le user avant mise en ligne.

export const COMPARATIF_BASE = "/comparatif";

/** Date de vérification des informations concurrents (à réactualiser à chaque revue). */
export const COMPARATIF_MAJ = "2026-08-25";
export const COMPARATIF_MAJ_LABEL = "août 2026";

export type Competitor = {
  slug: string; // "digiforma"
  vsSlug: string; // "ofmanager-vs-digiforma"
  name: string;
  /** Positionnement affiché par l'éditeur (repris/paraphrasé de son site). */
  tagline: string;
  /** Description factuelle du produit. */
  whatItIs: string;
  /** Public cible d'après l'éditeur. */
  cible: string;
  /** Forces reconnues honnêtement. */
  forces: string[];
  /** « Meilleur pour » (positionnement honnête). */
  bestFor: string;
  /** Note maturité / base installée (d'après le site de l'éditeur). */
  maturityNote: string;
  /** Note tarification. */
  pricingNote: string;
  /** Source vérifiable. */
  source: { label: string; href: string };
};

export const OFMANAGER = {
  name: "OFManager",
  tagline: "Le logiciel tout-en-un des organismes de formation réglementés (sécurité privée, VTC/Taxi).",
  differentiateurs: [
    "Formations sécurité & transport préconfigurées avec leurs prérequis réglementaires (TFP APS, SSIAP, CNAPS, T3P…)",
    "Vérification anti-fraude publique des titres délivrés (numéro + QR vérifiable par un tiers)",
    "Tarification publique et transparente",
    "Édité par CAP SOLUTIONS, issu du métier de la sécurité et du transport",
  ],
  bestFor:
    "les organismes réglementés en sécurité privée ou transport (VTC/Taxi) qui veulent leurs formations et prérequis déjà prêts, la vérification anti-fraude et une tarification claire.",
};

export const COMPETITORS: Competitor[] = [
  {
    slug: "digiforma",
    vsSlug: "ofmanager-vs-digiforma",
    name: "Digiforma",
    tagline: "« La plateforme des organismes de formation », avec son assistant IA métier.",
    whatItIs:
      "Digiforma est une plateforme généraliste de gestion des organismes de formation : administratif, e-learning, signature électronique, CRM, facturation et qualité, avec un assistant IA (Pétronille).",
    cible: "Organismes de formation généralistes, CFA, entreprises et organismes DPC.",
    forces: [
      "Éditeur établi avec une large base d'utilisateurs",
      "Périmètre fonctionnel très complet, tous domaines de formation",
      "Assistant IA intégré et e-learning natif",
    ],
    bestFor:
      "les organismes de formation généralistes, multi-domaines, qui veulent une plateforme mature avec assistant IA et une large communauté.",
    maturityNote: "Éditeur établi, plus de 5 500 OF utilisateurs (selon son site).",
    pricingNote: "Sur devis (pas de tarif public sur le site).",
    source: { label: "digiforma.com", href: "https://www.digiforma.com" },
  },
  {
    slug: "dendreo",
    vsSlug: "ofmanager-vs-dendreo",
    name: "Dendreo",
    tagline: "« Logiciel de gestion pour centres de formation exigeants », complet et cloud.",
    whatItIs:
      "Dendreo est un logiciel généraliste de gestion pour centres de formation : pédagogique, administratif, commercial, financier, qualité, extranets (stagiaires, formateurs, entreprises), e-learning et classes virtuelles.",
    cible: "Organismes de formation de toutes tailles, de la TPE aux grands comptes.",
    forces: [
      "Solution complète et éprouvée, avec des références grands comptes",
      "Extranets dédiés (stagiaires, formateurs, entreprises)",
      "E-learning intégré, classes virtuelles et paiement en ligne",
    ],
    bestFor:
      "les centres de formation, y compris de grande taille, cherchant une solution complète et éprouvée avec extranets et e-learning.",
    maturityNote: "Éditeur établi, références grands comptes (selon son site).",
    pricingNote: "Sur devis (pas de tarif public sur le site).",
    source: { label: "dendreo.com", href: "https://www.dendreo.com" },
  },
];

export function getCompetitorByVs(vsSlug: string): Competitor | undefined {
  return COMPETITORS.find((c) => c.vsSlug === vsSlug);
}

/**
 * Lignes du tableau « d'un coup d'œil ». Valeurs qualitatives et vérifiables.
 * `comp` peut dépendre du concurrent (maturité, tarif). `verdict` : "ofm" met en
 * avant OFManager, "parité" = équivalent (reconnu honnêtement), "comp" = force concurrent.
 */
export type CompareRow = {
  dim: string;
  ofm: string;
  comp: (c: Competitor) => string;
  verdict: "ofm" | "parite" | "comp";
};

export const COMPARE_ROWS: CompareRow[] = [
  {
    dim: "Positionnement",
    ofm: "Spécialiste des OF réglementés (sécurité privée, VTC/Taxi)",
    comp: () => "Plateforme généraliste, tous domaines de formation",
    verdict: "ofm",
  },
  {
    dim: "Formations métier préconfigurées (TFP APS, SSIAP, T3P…)",
    ofm: "Oui, prêtes à l'emploi avec leurs prérequis réglementaires",
    comp: () => "Outil généraliste, à paramétrer selon votre activité",
    verdict: "ofm",
  },
  {
    dim: "Vérification anti-fraude publique des titres",
    ofm: "Oui — numéro + QR vérifiable par un tiers",
    comp: () => "Non mise en avant sur le site",
    verdict: "ofm",
  },
  {
    dim: "Préparation d'audit Qualiopi",
    ofm: "Oui",
    comp: () => "Oui",
    verdict: "parite",
  },
  {
    dim: "E-learning, signature électronique, CRM, facturation",
    ofm: "Oui",
    comp: () => "Oui",
    verdict: "parite",
  },
  {
    dim: "Tarification",
    ofm: "Publique et transparente (page Tarifs)",
    comp: (c) => c.pricingNote,
    verdict: "ofm",
  },
  {
    dim: "Maturité / base installée",
    ofm: "Éditeur récent, spécialisé",
    comp: (c) => c.maturityNote,
    verdict: "comp",
  },
];
