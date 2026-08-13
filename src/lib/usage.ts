import { prisma } from "@/lib/prisma";
import { EmailStatut } from "@prisma/client";
import { PLANS, type FormuleKey } from "@/lib/plans";

// =============================================================
//  MODULE USAGE & FACTURATION AU VOLUME
//
//  Compte, par organisme et par MOIS, les métriques qui pilotent la
//  facturation au volume : e-mails envoyés + inscriptions (élèves). Les
//  quotas viennent de la formule (lib/plans.ts). Aucune table ajoutée :
//  on lit `EmailLog` (organismeId + sentAt) et `Inscription` (createdAt).
// =============================================================

export type UsageMetric = {
  used: number;
  limit: number | null; // null = illimité
  pct: number; // 0 si illimité
  near: boolean; // ≥ 80 % et < 100 %
  over: boolean; // ≥ 100 %
};

export type OrgUsage = {
  emails: UsageMetric;
  inscriptions: UsageMetric;
  moisLabel: string;
};

/**
 * Statut d'une métrique face à son quota — fonction PURE (testée).
 * `limit = null` → illimité (jamais « near »/« over »).
 */
export function usageStatus(used: number, limit: number | null): UsageMetric {
  if (limit == null) return { used, limit: null, pct: 0, near: false, over: false };
  const pct = limit > 0 ? Math.round((used / limit) * 100) : used > 0 ? 100 : 0;
  return { used, limit, pct, near: pct >= 80 && pct < 100, over: pct >= 100 };
}

/** Bornes [début, fin[ du mois courant. */
function moisBornes(now: Date): { start: Date; end: Date } {
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

/**
 * Usage du MOIS COURANT d'un organisme (e-mails envoyés + inscriptions) comparé
 * aux quotas de sa formule. Base de la facturation au volume.
 */
export async function getOrgUsage(
  organismeId: string,
  formule?: FormuleKey | string | null,
): Promise<OrgUsage> {
  const now = new Date();
  const { start, end } = moisBornes(now);
  const plan = (formule && PLANS[formule as FormuleKey]) || PLANS.BASIQUE;

  const [emails, inscriptions] = await Promise.all([
    prisma.emailLog.count({
      where: { organismeId, statut: EmailStatut.ENVOYE, sentAt: { gte: start, lt: end } },
    }),
    prisma.inscription.count({
      where: { organismeId, createdAt: { gte: start, lt: end } },
    }),
  ]);

  return {
    emails: usageStatus(emails, plan.emailsMois),
    inscriptions: usageStatus(inscriptions, plan.inscriptionsMois),
    moisLabel: now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
  };
}
