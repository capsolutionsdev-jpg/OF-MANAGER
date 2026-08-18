import { Wallet, TrendingUp, Users, Coins } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { euros, PLAN_ORDER } from "@/lib/plans";
import { getResolvedPlans } from "@/lib/pricing";
import { computeCurrentMrr, getMrrHistory, computeWaterfall, computeCohorts } from "@/lib/mrr-snapshot";
import { RecordMrrButton } from "@/components/console/record-mrr-button";

export const dynamic = "force-dynamic";

export default async function ConsoleAnalyticsPage() {
  await requireSuperAdmin();
  const now = new Date();

  const [{ plans }, current, history, orgs] = await Promise.all([
    getResolvedPlans(),
    computeCurrentMrr(),
    getMrrHistory(12),
    prisma.organisme.findMany({ where: { isDemo: false }, select: { createdAt: true, statut: true } }),
  ]);

  const cohorts = computeCohorts(orgs, now, 6);
  const waterfall =
    history.length >= 2
      ? computeWaterfall(history[history.length - 2].byOrg, history[history.length - 1].byOrg)
      : null;
  const arpa = current.actifs ? Math.round(current.total / current.actifs) : 0;
  const prevTotal = history.length >= 2 ? history[history.length - 2].total : 0;
  const churnRate = waterfall && prevTotal > 0 ? Math.abs(waterfall.churn) / prevTotal : 0;
  const ltv = churnRate > 0 ? Math.round(arpa / churnRate) : null;
  const histMax = Math.max(1, current.total, ...history.map((h) => h.total));

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Revenu récurrent, mouvements et rétention.">
        <RecordMrrButton />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="MRR" value={euros(current.total)} icon={Wallet} tint="emerald" trend="revenu mensuel récurrent" />
        <StatCard label="ARR" value={euros(current.total * 12)} icon={TrendingUp} tint="blue" trend="projection annuelle" />
        <StatCard label="ARPA" value={euros(arpa)} icon={Coins} tint="violet" trend="revenu moyen / client actif" />
        <StatCard label="Clients actifs" value={current.actifs} icon={Users} tint="amber" trend={`${current.essais} en essai`} />
      </div>

      {/* Historique MRR */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">MRR — historique (12 mois)</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              L&apos;historique se construit : un point est enregistré chaque mois (cron), ou immédiatement
              via «&nbsp;Enregistrer le point du mois&nbsp;».
            </p>
          ) : (
            <div className="flex h-[160px] items-end gap-2">
              {history.map((h) => (
                <div key={h.mois} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[11px] font-semibold">{euros(h.total)}</span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-primary to-primary/60"
                    style={{ height: `${Math.max(4, (h.total / histMax) * 120)}px` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{h.mois.slice(2)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Waterfall */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Mouvement du MRR (dernier mois)</CardTitle>
          </CardHeader>
          <CardContent>
            {waterfall ? (
              <div className="space-y-2 text-sm">
                <WaterfallLine label="Nouveau" value={waterfall.nouveau} positive />
                <WaterfallLine label="Expansion" value={waterfall.expansion} positive />
                <WaterfallLine label="Contraction" value={waterfall.contraction} />
                <WaterfallLine label="Churn" value={waterfall.churn} />
                <div className="flex items-center justify-between border-t pt-2 font-semibold">
                  <span>Net</span>
                  <span className={waterfall.net >= 0 ? "text-emerald-600" : "text-rose-600"}>
                    {waterfall.net > 0 ? "+" : ""}
                    {euros(waterfall.net)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Disponible dès 2 points d&apos;historique (2 mois).</p>
            )}
          </CardContent>
        </Card>

        {/* Cohortes */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Cohortes — rétention par mois d&apos;inscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cohorts.map((c) => (
              <div key={c.mois} className="flex items-center gap-3 text-sm">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">{c.mois}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${c.retention}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                  {c.actifs}/{c.total} · {c.retention}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* MRR par formule */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">MRR par formule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {PLAN_ORDER.map((key) => (
              <div key={key} className="flex items-center gap-3 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: plans[key].color }} />
                <span className="font-medium">{plans[key].name}</span>
                <span className="ml-auto font-semibold">{euros(current.byFormule[key])}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* LTV */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">LTV estimée</CardTitle>
          </CardHeader>
          <CardContent>
            {ltv != null ? (
              <>
                <p className="text-2xl font-bold">{euros(ltv)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  ARPA ({euros(arpa)}) ÷ churn mensuel ({Math.round(churnRate * 100)}%). Estimation — se
                  fiabilise avec l&apos;historique.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Calculable dès qu&apos;un churn mensuel est mesuré (≥ 2 mois d&apos;historique avec un départ).
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WaterfallLine({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  const cls = value === 0 ? "text-muted-foreground" : positive ? "text-emerald-600" : "text-rose-600";
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cls}>
        {value > 0 ? "+" : ""}
        {euros(value)}
      </span>
    </div>
  );
}
