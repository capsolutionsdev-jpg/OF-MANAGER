// Formules d'abonnement OFManager vendues aux organismes (console éditeur).
//
// Grille « 4 paliers » du plan de commercialisation (v21/08/2026) :
//   • Indépendant  59 € : formateur seul       — 100 stagiaires/mois
//   • Pro         189 € : centre 2-3 formateurs — 300 stagiaires/mois (le plus choisi)
//   • Croissance  349 € : centre structuré      — 800 stagiaires/mois, formateurs illimités
//   • Réseau      690 € : réseau multi-sites     — illimité, sur devis
//
// Chaque formule = un bundle de fonctionnalités pré-cochées à la création,
// personnalisable ensuite (ajout/retrait à la carte). La formule pilote aussi le
// revenu (MRR) du tableau de bord. Prix HT, repères éditables ici — et surchargés
// en console via PlanTarif (cf. lib/pricing.ts). cf. Organisme.formule
// (enum FormuleAbonnement) + lib/features.
//
// NB Lot 1 (grille) : les OPTIONS à la carte (site vitrine, leads, IA, marque
// blanche…) et les PACKS MÉTIER (Sécurité/Transport) sont modélisés séparément
// au Lot 2. Ici, le bundle de base = les colonnes « oui » de la feuille 2 « Grille ».

import { FEATURE_KEYS } from "@/lib/features";

export type FormuleKey = "INDEPENDANT" | "PRO" | "CROISSANCE" | "RESEAU";

// ── Bundles de fonctionnalités par palier (cf. feuille « 2. Grille ») ─────────
// Socle : « oui » sur tous les paliers.
const SOCLE = [
  "crm", "candidats", "formations", "sessions", "suivi-pedagogique",
  "formateurs", "planning", "salles",
  "documents", "signatures", "automatisations",
  "qualiopi", "bpf", "rgpd",
  "facturation", // Devis & facturation — descendu sur tous les paliers
  "support",     // inclus partout
];
// Débloqué dès Pro.
const PRO_PLUS = [
  "clients-pro", "portail-client", "comptabilite", // B2B + extranet entreprise + suivi comptable
  "financements",                                   // CPF/OPCO — descendu sur Pro
  "elearning",
  "kanban", "taches", "notifications", "rapports",
  "scoring",
  "sms", "devis-signature",
];
// Débloqué dès Croissance (options d'acquisition incluses).
const CROISSANCE_PLUS = [
  "site-vitrine", "blog", "leads-multicanal", "ia", "communication",
];
// Réseau = toutes les fonctionnalités (dont modules métier diplômes/jurys/T3P).

const INDEPENDANT_FEATURES = [...SOCLE];
const PRO_FEATURES = [...INDEPENDANT_FEATURES, ...PRO_PLUS];
const CROISSANCE_FEATURES = [...PRO_FEATURES, ...CROISSANCE_PLUS];
const RESEAU_FEATURES = [...FEATURE_KEYS]; // tout

export type Plan = {
  key: FormuleKey;
  name: string;
  price: number; // € / mois (repère HT)
  priceYear: number | null; // € / an (−15 %) ; null = sur devis
  color: string;
  tagline: string;
  features: string[];
  supportLevel: string;
  maxComptes: number | null; // comptes back-office inclus ; null = illimité
  formateurs: number | null; // formateurs inclus ; null = illimité
  // Quotas de VOLUME mensuels inclus (null = illimité). Base de la facturation au
  // volume : e-mails envoyés + inscriptions (stagiaires) sur le mois. Cf. lib/usage.ts.
  emailsMois: number | null;
  inscriptionsMois: number | null; // = stagiaires / mois
  smsMois: number; // SMS inclus / mois (cf. Grille ; packs prépayés = Lot 8)
};

// Prix d'un compte back-office supplémentaire au-delà de l'inclus (€ HT / mois).
export const EXTRA_SEAT_PRICE_EUR = 20;

// Remise du paiement annuel (prépayé) vs mensuel.
export const ANNUAL_DISCOUNT_PCT = 15;

// Facturation à l'usage : prix du DÉPASSEMENT de quota mensuel (€ HT). Repères
// éditables — c'est le levier « faire payer les automatismes ». cf. lib/usage.ts.
export const OVERAGE_EMAIL_EUR = 0.01; // par e-mail au-delà du quota de la formule
export const OVERAGE_INSCRIPTION_EUR = 5; // par inscription au-delà du quota

export const PLANS: Record<FormuleKey, Plan> = {
  INDEPENDANT: {
    key: "INDEPENDANT", name: "Indépendant", price: 59, priceYear: 602, color: "#64748b",
    tagline: "Le formateur seul — 100 stagiaires/mois inclus",
    features: INDEPENDANT_FEATURES, supportLevel: "Support e-mail (48 h)",
    maxComptes: 1, formateurs: 1, emailsMois: 2000, inscriptionsMois: 100, smsMois: 0,
  },
  PRO: {
    key: "PRO", name: "Pro", price: 189, priceYear: 1928, color: "#2C53C0",
    tagline: "Le centre qui structure — 300 stagiaires/mois",
    features: PRO_FEATURES, supportLevel: "Support e-mail (24 h)",
    maxComptes: 2, formateurs: 3, emailsMois: 10000, inscriptionsMois: 300, smsMois: 200,
  },
  CROISSANCE: {
    key: "CROISSANCE", name: "Croissance", price: 349, priceYear: 3560, color: "#7C3AED",
    tagline: "Le centre en croissance — 800 stagiaires/mois, formateurs illimités",
    features: CROISSANCE_FEATURES, supportLevel: "Support prioritaire",
    maxComptes: 5, formateurs: null, emailsMois: null, inscriptionsMois: 800, smsMois: 800,
  },
  RESEAU: {
    key: "RESEAU", name: "Réseau", price: 690, priceYear: null, color: "#B45309",
    tagline: "Réseau & multi-sites — sur mesure, tout illimité",
    features: RESEAU_FEATURES, supportLevel: "Support dédié",
    maxComptes: null, formateurs: null, emailsMois: null, inscriptionsMois: null, smsMois: 2500,
  },
};

export const PLAN_ORDER: FormuleKey[] = ["INDEPENDANT", "PRO", "CROISSANCE", "RESEAU"];

export const FORMULE_KEYS = new Set<string>(PLAN_ORDER);

/** Bundle de fonctionnalités d'une formule (clés). */
export function featuresForFormule(key: FormuleKey): string[] {
  return PLANS[key].features;
}

/** Modules avancés activés (sert au repli quand aucune formule n'est posée). */
import { ADVANCED_FEATURE_KEYS } from "@/lib/features";
function advancedCount(fonctionnalites: string[] | null | undefined): number {
  if (!fonctionnalites?.length) return 0;
  return ADVANCED_FEATURE_KEYS.filter((k) => fonctionnalites.includes(k)).length;
}

/**
 * Formule (clé) d'un organisme : sa formule si elle est posée, sinon une
 * estimation dérivée du nombre de modules avancés activés (compat des tenants
 * existants). Fonction pure — sert aussi à appliquer les prix édités (cf. pricing.ts).
 */
export function planKeyForOrg(
  formule: string | null | undefined,
  fonctionnalites: string[] | null | undefined,
): FormuleKey {
  if (formule && (formule in PLANS)) return formule as FormuleKey;
  const n = advancedCount(fonctionnalites);
  if (n >= 10) return "RESEAU";
  if (n >= 5) return "CROISSANCE";
  if (n >= 1) return "PRO";
  return "INDEPENDANT";
}

/**
 * Plan d'un organisme (valeurs par défaut, prix de repère). Pour le prix réel
 * facturé/affiché, passer par les tarifs édités (lib/pricing.ts).
 */
export function planForOrg(
  formule: string | null | undefined,
  fonctionnalites: string[] | null | undefined,
): Plan {
  return PLANS[planKeyForOrg(formule, fonctionnalites)];
}

/** Revenu mensuel facturable : prix de la formule si ACTIF, 0 sinon. */
export function monthlyRevenue(
  statut: string,
  formule: string | null | undefined,
  fonctionnalites: string[] | null | undefined,
): number {
  return statut === "ACTIF" ? planForOrg(formule, fonctionnalites).price : 0;
}

export function euros(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

/**
 * Montant monétaire pour les DOCUMENTS légaux (factures, contrats) : toujours
 * deux décimales. À utiliser partout où le montant affiché doit coïncider au
 * centime avec le XML Factur-X et le prélèvement (cf. audit A06-002). Ne pas
 * utiliser `euros()` (0 décimale) sur un document — réservé aux tableaux de bord.
 */
export function eurosDoc(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
