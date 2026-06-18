// Agrégats multi-tenants pour le tableau de bord éditeur (console SUPERADMIN).
// Lecture directe via `prisma` (NON cloisonné) : on veut une vue globale de
// tous les organismes clients. À n'utiliser que derrière requireSuperAdmin.

import { prisma } from "@/lib/prisma";
import { ADVANCED_FEATURE_KEYS, featureLabel } from "@/lib/features";
import { planKeyForOrg, PLAN_ORDER, type FormuleKey } from "@/lib/plans";
import { getResolvedPlans } from "@/lib/pricing";

export type OrgRow = {
  id: string;
  nom: string;
  statut: string;
  createdAt: Date;
  sousDomaine: string | null;
  design: string | null;
  appUrl: string | null;
  version: string | null;
  formule: string | null;
  fonctionnalites: string[];
  userCount: number;
  candidatCount: number;
  sessionCount: number;
  planKey: FormuleKey;
  planName: string;
  mrr: number;
};

export type ConsoleOverview = {
  rows: OrgRow[];
  totals: {
    organismes: number;
    actifs: number;
    essais: number;
    suspendus: number;
    users: number;
    candidats: number;
    sessions: number;
    mrr: number;
    arr: number;
  };
  byStatut: { actif: number; essai: number; suspendu: number };
  mrrByPlan: { key: FormuleKey; name: string; color: string; count: number; mrr: number }[];
  adoption: { key: string; label: string; count: number; pct: number }[];
  growth: { label: string; count: number }[];
  alerts: {
    essais: OrgRow[];
    suspendus: OrgRow[];
    inactifs: OrgRow[];
  };
};

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export async function getConsoleOverview(): Promise<ConsoleOverview> {
  const [organismes, candByOrg, sessByOrg, { plans: planMap }] = await Promise.all([
    prisma.organisme.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nom: true,
        statut: true,
        createdAt: true,
        sousDomaine: true,
        design: true,
        appUrl: true,
        version: true,
        formule: true,
        fonctionnalites: true,
        _count: { select: { users: true } },
      },
    }),
    prisma.candidat.groupBy({ by: ["organismeId"], _count: { _all: true } }),
    prisma.session.groupBy({ by: ["organismeId"], _count: { _all: true } }),
    getResolvedPlans(),
  ]);

  const candMap = new Map<string, number>();
  for (const c of candByOrg) if (c.organismeId) candMap.set(c.organismeId, c._count._all);
  const sessMap = new Map<string, number>();
  for (const s of sessByOrg) if (s.organismeId) sessMap.set(s.organismeId, s._count._all);

  const rows: OrgRow[] = organismes.map((o) => {
    const planKey = planKeyForOrg(o.formule, o.fonctionnalites);
    return {
      id: o.id,
      nom: o.nom,
      statut: o.statut,
      createdAt: o.createdAt,
      sousDomaine: o.sousDomaine,
      design: o.design,
      appUrl: o.appUrl,
      version: o.version,
      formule: o.formule,
      fonctionnalites: o.fonctionnalites,
      userCount: o._count.users,
      candidatCount: candMap.get(o.id) ?? 0,
      sessionCount: sessMap.get(o.id) ?? 0,
      planKey,
      planName: planMap[planKey].name,
      // Prix réel (édité dans la console) si l'organisme est actif, sinon 0.
      mrr: o.statut === "ACTIF" ? planMap[planKey].price : 0,
    };
  });

  const actifs = rows.filter((r) => r.statut === "ACTIF");
  const essais = rows.filter((r) => r.statut === "ESSAI");
  const suspendus = rows.filter((r) => r.statut === "SUSPENDU");
  const mrr = rows.reduce((s, r) => s + r.mrr, 0);

  // MRR par formule (organismes actifs uniquement)
  const mrrByPlan = PLAN_ORDER.map((key) => {
    const grp = actifs.filter((r) => r.planKey === key);
    return {
      key,
      name: planMap[key].name,
      color: planMap[key].color,
      count: grp.length,
      mrr: grp.reduce((s, r) => s + r.mrr, 0),
    };
  });

  // Adoption des modules avancés (sur l'ensemble des organismes)
  const total = rows.length || 1;
  const adoption = ADVANCED_FEATURE_KEYS.map((key) => {
    const count = rows.filter((r) => r.fonctionnalites.includes(key)).length;
    return { key, label: featureLabel(key), count, pct: Math.round((count / total) * 100) };
  }).sort((a, b) => b.count - a.count);

  // Croissance : organismes créés sur les 6 derniers mois
  const now = new Date();
  const growth: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const count = rows.filter((r) => r.createdAt >= d && r.createdAt < next).length;
    growth.push({ label: MONTHS[d.getMonth()], count });
  }

  return {
    rows,
    totals: {
      organismes: rows.length,
      actifs: actifs.length,
      essais: essais.length,
      suspendus: suspendus.length,
      users: rows.reduce((s, r) => s + r.userCount, 0),
      candidats: rows.reduce((s, r) => s + r.candidatCount, 0),
      sessions: rows.reduce((s, r) => s + r.sessionCount, 0),
      mrr,
      arr: mrr * 12,
    },
    byStatut: { actif: actifs.length, essai: essais.length, suspendu: suspendus.length },
    mrrByPlan,
    adoption,
    growth,
    alerts: {
      essais,
      suspendus,
      inactifs: rows.filter((r) => r.candidatCount === 0 && r.sessionCount === 0 && r.statut !== "SUSPENDU"),
    },
  };
}
