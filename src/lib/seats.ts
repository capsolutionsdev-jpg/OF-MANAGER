import "server-only";
import { prisma } from "@/lib/prisma";
import { planKeyForOrg, EXTRA_SEAT_PRICE_EUR } from "@/lib/plans";
import { getResolvedPlans } from "@/lib/pricing";

// « Sièges » facturés = comptes back-office (équipe de l'OF). Les formateurs et
// apprenants (espaces opérationnels) ne comptent PAS comme sièges.
export const BILLABLE_ROLES = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"] as const;

export { EXTRA_SEAT_PRICE_EUR };

export type SeatInfo = {
  used: number;
  included: number | null; // comptes inclus dans la formule (null = illimité)
  limit: number | null; // limite effective (override éditeur sinon formule) — null = illimité
  canAdd: boolean;
};

/** État des sièges d'un organisme : utilisés / inclus / limite effective. */
export async function getSeatInfo(organismeId: string): Promise<SeatInfo> {
  const [org, used, resolved] = await Promise.all([
    prisma.organisme.findUnique({
      where: { id: organismeId },
      select: { formule: true, fonctionnalites: true, maxUtilisateurs: true },
    }),
    prisma.user.count({ where: { organismeId, role: { in: [...BILLABLE_ROLES] } } }),
    getResolvedPlans(),
  ]);

  const included = org ? resolved.plans[planKeyForOrg(org.formule, org.fonctionnalites)].maxComptes : null;
  // Limite effective : un override manuel de l'éditeur (sièges supplémentaires
  // facturés) prime sur les comptes inclus de la formule.
  const limit = org?.maxUtilisateurs ?? included;
  const canAdd = limit == null || used < limit;
  return { used, included, limit, canAdd };
}
