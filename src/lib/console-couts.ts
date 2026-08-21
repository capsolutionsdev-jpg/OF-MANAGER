import "server-only";
import { prisma } from "@/lib/prisma";
import { monthlyRevenue } from "@/lib/plans";
import { estimateClientCost, marge, type UsageCounts } from "@/lib/couts";

// Agrégat « coûts & marge » de la console éditeur : coût estimé par client
// (conso comptable × tarifs fournisseurs) vs revenu récurrent. cf. lib/couts.ts.

export type CoutRow = {
  id: string;
  nom: string;
  statut: string;
  revenu: number;
  cout: number;
  margeEur: number;
  margePct: number;
  usage: UsageCounts;
};

export type CoutsOverview = {
  rows: CoutRow[];
  totalRevenu: number;
  totalCout: number;
  totalMarge: number;
  margePct: number;
};

function monthStart(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function getCoutsOverview(): Promise<CoutsOverview> {
  const start = monthStart();
  const [orgs, emailG, inscrG, smsG] = await Promise.all([
    prisma.organisme.findMany({
      where: { isDemo: false },
      select: { id: true, nom: true, statut: true, formule: true, fonctionnalites: true },
    }),
    prisma.emailLog.groupBy({ by: ["organismeId"], where: { statut: "ENVOYE", sentAt: { gte: start } }, _count: true }),
    prisma.inscription.groupBy({ by: ["organismeId"], where: { createdAt: { gte: start } }, _count: true }),
    prisma.smsLog.groupBy({ by: ["organismeId"], where: { statut: "ENVOYE", createdAt: { gte: start } }, _count: true }),
  ]);

  const toMap = (g: { organismeId: string | null; _count: number }[]) =>
    new Map(g.filter((x) => x.organismeId).map((x) => [x.organismeId as string, x._count]));
  const emailMap = toMap(emailG);
  const inscrMap = toMap(inscrG);
  const smsMap = toMap(smsG);

  const rows: CoutRow[] = orgs.map((o) => {
    const usage: UsageCounts = {
      emails: emailMap.get(o.id) ?? 0,
      inscriptions: inscrMap.get(o.id) ?? 0,
      sms: smsMap.get(o.id) ?? 0,
    };
    const cout = estimateClientCost(usage).total;
    const revenu = monthlyRevenue(o.statut, o.formule, o.fonctionnalites);
    const m = marge(revenu, cout);
    return { id: o.id, nom: o.nom, statut: o.statut, revenu, cout, margeEur: m.euros, margePct: m.pct, usage };
  });
  rows.sort((a, b) => b.cout - a.cout);

  const totalRevenu = Math.round(rows.reduce((s, r) => s + r.revenu, 0) * 100) / 100;
  const totalCout = Math.round(rows.reduce((s, r) => s + r.cout, 0) * 100) / 100;
  const totalMarge = Math.round((totalRevenu - totalCout) * 100) / 100;
  const margePct = totalRevenu > 0 ? Math.round((totalMarge / totalRevenu) * 100) : 0;

  return { rows, totalRevenu, totalCout, totalMarge, margePct };
}
