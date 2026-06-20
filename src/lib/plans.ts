// Formules d'abonnement vendues aux organismes (console éditeur).
//
// Chaque formule = un bundle de fonctionnalités pré-cochées à la création, que
// l'on peut ensuite personnaliser (ajout/retrait à la carte). La formule pilote
// aussi le revenu (MRR) du tableau de bord. Les prix sont des repères, faciles
// à modifier ici. cf. Organisme.formule (enum FormuleAbonnement) + lib/features.
//
// Composition validée :
//   • Basique  79 € : Cœur métier + Conformité + Support
//   • Medium  149 € : Basique + Gestion étendue + 6 modules avancés
//   • Complet 249 € : tout (tous les modules) + Support prioritaire

import { FEATURE_KEYS } from "@/lib/features";

export type FormuleKey = "BASIQUE" | "MEDIUM" | "COMPLET";

// ── Sous-ensembles de fonctionnalités ───────────────────────────────────────
const COEUR_METIER = [
  "crm", "candidats", "formations", "sessions", "suivi-pedagogique",
  "formateurs", "planning", "documents", "signatures",
];
const CONFORMITE = ["qualiopi", "bpf", "rgpd"];
const GESTION_ETENDUE = [
  "clients-pro", "salles", "elearning", "comptabilite", "facturation", "automatisations",
];
const SUPPORT = ["support"]; // inclus dans toutes les formules
const MEDIUM_AVANCES = ["notifications", "taches", "rapports", "devis-signature", "kanban", "scoring"];

const BASIQUE_FEATURES = [...COEUR_METIER, ...CONFORMITE, ...SUPPORT];
const MEDIUM_FEATURES = [...BASIQUE_FEATURES, ...GESTION_ETENDUE, ...MEDIUM_AVANCES];
const COMPLET_FEATURES = [...FEATURE_KEYS]; // toutes les fonctionnalités, support compris

export type Plan = {
  key: FormuleKey;
  name: string;
  price: number; // € / mois (repère)
  color: string;
  tagline: string;
  features: string[];
  supportLevel: string;
  maxComptes: number | null; // comptes back-office inclus ; null = illimité
};

// Prix d'un compte back-office supplémentaire au-delà de l'inclus (€ HT / mois).
export const EXTRA_SEAT_PRICE_EUR = 20;

export const PLANS: Record<FormuleKey, Plan> = {
  BASIQUE: {
    key: "BASIQUE", name: "Basique", price: 79, color: "#64748b",
    tagline: "L'essentiel pour démarrer, conformité incluse",
    features: BASIQUE_FEATURES, supportLevel: "Support e-mail (48 h)", maxComptes: 3,
  },
  MEDIUM: {
    key: "MEDIUM", name: "Medium", price: 149, color: "#2C53C0",
    tagline: "Gestion complète + modules de productivité",
    features: MEDIUM_FEATURES, supportLevel: "Support e-mail (24 h)", maxComptes: 5,
  },
  COMPLET: {
    key: "COMPLET", name: "Complet", price: 249, color: "#7C3AED",
    tagline: "Toute la plateforme, IA & marque blanche",
    features: COMPLET_FEATURES, supportLevel: "Support prioritaire", maxComptes: null,
  },
};

export const PLAN_ORDER: FormuleKey[] = ["BASIQUE", "MEDIUM", "COMPLET"];

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
  if (n >= 5) return "COMPLET";
  if (n >= 1) return "MEDIUM";
  return "BASIQUE";
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
