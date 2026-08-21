import "server-only";
import { prisma } from "@/lib/prisma";
import { getResolvedPlans } from "@/lib/pricing";
import { planKeyForOrg, type FormuleKey } from "@/lib/plans";

// =============================================================
//  SNAPSHOT MRR ÉDITEUR + ANALYSES (console analytics).
//
//  Le MRR à un instant T n'est pas reconstituable a posteriori (statut/formule
//  changent sans historique) → on enregistre un SNAPSHOT mensuel (idempotent, via
//  cron). `byOrg` conserve le MRR par organisme, ce qui permet un vrai WATERFALL
//  (new / expansion / contraction / churn) entre deux mois. Les analyses pures
//  (waterfall, cohortes, clé de mois) sont testées.
// =============================================================

export type MrrByFormule = Record<FormuleKey, number>;
export type MrrComputation = {
  total: number;
  actifs: number;
  essais: number;
  byFormule: MrrByFormule;
  byOrg: Record<string, number>;
};

/** Clé de mois « AAAA-MM » (PUR). */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** MRR courant (total, par formule, par organisme). MRR/org = prix résolu si ACTIF, sinon 0. */
export async function computeCurrentMrr(): Promise<MrrComputation> {
  const { plans } = await getResolvedPlans();
  const orgs = await prisma.organisme.findMany({
    where: { isDemo: false },
    select: { id: true, statut: true, formule: true, fonctionnalites: true },
  });
  const byFormule: MrrByFormule = { INDEPENDANT: 0, PRO: 0, CROISSANCE: 0, RESEAU: 0 };
  const byOrg: Record<string, number> = {};
  let total = 0;
  let actifs = 0;
  let essais = 0;
  for (const o of orgs) {
    if (o.statut === "ACTIF") actifs++;
    else if (o.statut === "ESSAI") essais++;
    const key = planKeyForOrg(o.formule, o.fonctionnalites);
    const mrr = o.statut === "ACTIF" ? plans[key].price : 0;
    if (mrr > 0) {
      byOrg[o.id] = mrr;
      byFormule[key] += mrr;
      total += mrr;
    }
  }
  return { total, actifs, essais, byFormule, byOrg };
}

/** Enregistre (idempotent) le snapshot MRR d'un mois (par défaut le mois courant). */
export async function recordMrrSnapshot(now = new Date()): Promise<{ mois: string; total: number }> {
  const mois = monthKey(now);
  const c = await computeCurrentMrr();
  const data = {
    total: c.total,
    actifs: c.actifs,
    essais: c.essais,
    byFormule: c.byFormule as unknown as object,
    byOrg: c.byOrg as unknown as object,
  };
  await prisma.mrrSnapshot.upsert({ where: { mois }, create: { mois, ...data }, update: data });
  return { mois, total: c.total };
}

export type SnapshotRow = {
  mois: string;
  total: number;
  actifs: number;
  essais: number;
  byFormule: MrrByFormule;
  byOrg: Record<string, number>;
};

/** Historique des snapshots, ancien → récent. */
export async function getMrrHistory(limit = 12): Promise<SnapshotRow[]> {
  const rows = await prisma.mrrSnapshot.findMany({ orderBy: { mois: "desc" }, take: limit });
  return rows
    .map((r) => ({
      mois: r.mois,
      total: r.total,
      actifs: r.actifs,
      essais: r.essais,
      byFormule: r.byFormule as unknown as MrrByFormule,
      byOrg: r.byOrg as unknown as Record<string, number>,
    }))
    .reverse();
}

// ---- Analyses PURES (testées) ----

export type Waterfall = {
  nouveau: number;
  expansion: number;
  contraction: number;
  churn: number;
  net: number;
};

/** Décompose la variation de MRR entre deux mois, par organisme — PUR. */
export function computeWaterfall(prev: Record<string, number>, curr: Record<string, number>): Waterfall {
  let nouveau = 0;
  let expansion = 0;
  let contraction = 0;
  let churn = 0;
  for (const id of new Set([...Object.keys(prev), ...Object.keys(curr)])) {
    const p = prev[id] ?? 0;
    const c = curr[id] ?? 0;
    if (p === 0 && c > 0) nouveau += c;
    else if (p > 0 && c === 0) churn -= p;
    else if (c > p) expansion += c - p;
    else if (c < p) contraction -= p - c;
  }
  return { nouveau, expansion, contraction, churn, net: nouveau + expansion + contraction + churn };
}

export type Cohort = { mois: string; total: number; actifs: number; retention: number };

/** Cohortes par mois d'inscription : combien sont ENCORE actifs aujourd'hui — PUR. */
export function computeCohorts(
  orgs: { createdAt: Date; statut: string }[],
  now: Date,
  monthsBack = 6,
): Cohort[] {
  const out: Cohort[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const grp = orgs.filter((o) => o.createdAt >= d && o.createdAt < next);
    const actifs = grp.filter((o) => o.statut === "ACTIF").length;
    out.push({
      mois: monthKey(d),
      total: grp.length,
      actifs,
      retention: grp.length ? Math.round((actifs / grp.length) * 100) : 0,
    });
  }
  return out;
}
