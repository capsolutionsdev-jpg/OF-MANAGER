import { getResolvedPlans } from "@/lib/pricing";
import { PLAN_ORDER } from "@/lib/plans";

export const runtime = "nodejs";
// Cache court : les tarifs bougent rarement, mais un changement en console
// doit se refléter vite sur les sites qui consomment cette API.
export const revalidate = 300;

/**
 * Tarifs publics des formules (pilotés depuis la console éditeur, PlanTarif).
 * Consommé par la landing OFManager et tout site marketing externe.
 * GET /api/public/pricing → { plans: [{ key, nom, prix, tagline, populaire,
 * supportLevel, comptesInclus, fonctionnalites }], devise, periode }
 */
export async function GET() {
  const { plans, popular } = await getResolvedPlans();
  return Response.json(
    {
      devise: "EUR",
      periode: "mois",
      plans: PLAN_ORDER.map((key) => ({
        key,
        nom: plans[key].name,
        prix: plans[key].price,
        tagline: plans[key].tagline,
        populaire: key === popular,
        supportLevel: plans[key].supportLevel,
        comptesInclus: plans[key].maxComptes, // null = illimité
        fonctionnalites: plans[key].features,
      })),
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
