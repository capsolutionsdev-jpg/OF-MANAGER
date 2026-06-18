import "server-only";

// Résout les tarifs des formules : valeurs par défaut de lib/plans.ts (nom,
// couleur, fonctionnalités) fusionnées avec les overrides éditables stockés en
// base (PlanTarif : prix, accroche, niveau de support, badge « le plus choisi »).
// Module SERVEUR uniquement — lu par la vitrine (/tarifs), le tableau de bord
// (MRR) et le sélecteur de formule de la console.

import { prisma } from "@/lib/prisma";
import { PLANS, PLAN_ORDER, type Plan, type FormuleKey } from "@/lib/plans";

export type ResolvedPlan = Plan & { populaire: boolean };

/** Formule par défaut mise en avant si aucune n'est marquée « populaire ». */
const DEFAULT_POPULAR: FormuleKey = "MEDIUM";

/**
 * Renvoie les 3 plans résolus (défauts + overrides DB) et la formule à mettre
 * en avant. Tolérant aux pannes : en cas d'erreur DB, retombe sur les défauts.
 */
export async function getResolvedPlans(): Promise<{
  plans: Record<FormuleKey, ResolvedPlan>;
  popular: FormuleKey;
}> {
  let overrides: { formule: string; prix: number; tagline: string; supportLevel: string; populaire: boolean }[] = [];
  try {
    overrides = await prisma.planTarif.findMany();
  } catch {
    overrides = []; // table absente / DB indisponible → défauts
  }
  const byKey = new Map(overrides.map((o) => [o.formule, o]));

  let popular: FormuleKey | null = null;
  const plans = {} as Record<FormuleKey, ResolvedPlan>;
  for (const key of PLAN_ORDER) {
    const o = byKey.get(key);
    const populaire = o?.populaire ?? false;
    if (populaire && !popular) popular = key;
    plans[key] = {
      ...PLANS[key],
      price: o?.prix ?? PLANS[key].price,
      tagline: o?.tagline ?? PLANS[key].tagline,
      supportLevel: o?.supportLevel ?? PLANS[key].supportLevel,
      populaire,
    };
  }

  return { plans, popular: popular ?? DEFAULT_POPULAR };
}

/** Carte des prix résolus par formule (€ / mois). Pour le calcul du MRR. */
export async function getPlanPrices(): Promise<Record<FormuleKey, number>> {
  const { plans } = await getResolvedPlans();
  return {
    BASIQUE: plans.BASIQUE.price,
    MEDIUM: plans.MEDIUM.price,
    COMPLET: plans.COMPLET.price,
  };
}
