import Link from "next/link";
import {
  Plus, Palette, Building2, Users, GraduationCap, CalendarDays,
  Wallet, TrendingUp, AlertTriangle, MoonStar, ArrowRight, Sparkles, Filter,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ConvertButton } from "@/components/console/statut-actions";
import { getConsoleOverview, getGrowthFunnel } from "@/lib/console-stats";
import { euros } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUT_BADGE: Record<string, string> = {
  ESSAI: "bg-amber-500/10 text-amber-700",
  ACTIF: "bg-emerald-500/10 text-emerald-700",
  SUSPENDU: "bg-rose-500/10 text-rose-700",
};

export default async function ConsoleDashboard() {
  const [o, funnel] = await Promise.all([getConsoleOverview(), getGrowthFunnel()]);
  const { totals, byStatut, growth, mrrByPlan, adoption, alerts, rows } = o;

  // Étapes du funnel d'acquisition (barres dégressives, largeur relative aux leads).
  const funnelSteps = [
    { label: "Leads", value: funnel.leads },
    { label: "Démos demandées", value: funnel.demandesDemos },
    { label: "Démos provisionnées", value: funnel.demosProvisionnees },
    { label: "Démos connectées", value: funnel.demosConnectees },
    { label: "Convertis", value: funnel.convertis },
  ];
  const funnelMax = Math.max(1, funnel.leads);

  const growthMax = Math.max(1, ...growth.map((g) => g.count));
  const statutTotal = Math.max(1, byStatut.actif + byStatut.essai + byStatut.suspendu);
  const segActif = (byStatut.actif / statutTotal) * 100;
  const segEssai = (byStatut.essai / statutTotal) * 100;
  const donut = `conic-gradient(#10B981 0 ${segActif}%, #F59E0B 0 ${segActif + segEssai}%, #E11D48 0 100%)`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue d'ensemble de votre activité éditeur — tous les organismes clients."
      >
        <Button variant="outline" render={<Link href="/console/designs" />}>
          <Palette className="mr-2 h-4 w-4" /> Designs
        </Button>
        <Button render={<Link href="/console/nouveau" />}>
          <Plus className="mr-2 h-4 w-4" /> Nouvel organisme
        </Button>
      </PageHeader>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Organismes"
          value={totals.organismes}
          icon={Building2}
          tint="blue"
          trend={`${totals.actifs} actifs · ${totals.essais} en essai`}
        />
        <StatCard label="Comptes" value={totals.users} icon={Users} tint="violet" />
        <StatCard label="Candidats" value={totals.candidats} icon={GraduationCap} tint="emerald" />
        <StatCard label="Sessions" value={totals.sessions} icon={CalendarDays} tint="amber" />
        <StatCard
          label="MRR estimé"
          value={euros(totals.mrr)}
          icon={Wallet}
          tint="emerald"
          trend="revenu mensuel récurrent"
        />
        <StatCard
          label="ARR estimé"
          value={euros(totals.arr)}
          icon={TrendingUp}
          tint="blue"
          trend="projection annuelle"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Croissance */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Nouveaux organismes (6 mois)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[150px] items-end gap-3">
              {growth.map((g, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">{g.count}</span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-primary to-primary/60"
                    style={{ height: `${Math.max(4, (g.count / growthMax) * 110)}px` }}
                  />
                  <span className="text-[11px] text-muted-foreground">{g.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Répartition statuts */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-5">
            <div
              className="grid h-28 w-28 shrink-0 place-items-center rounded-full"
              style={{ background: donut }}
            >
              <div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-card text-center">
                <div>
                  <div className="text-xl font-bold leading-none">{totals.organismes}</div>
                  <div className="text-[10px] text-muted-foreground">clients</div>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <Legend color="#10B981" label="Actifs" value={byStatut.actif} />
              <Legend color="#F59E0B" label="En essai" value={byStatut.essai} />
              <Legend color="#E11D48" label="Suspendus" value={byStatut.suspendu} />
            </div>
          </CardContent>
        </Card>

        {/* MRR par formule */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Revenu par formule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mrrByPlan.map((p) => (
              <div key={p.key} className="flex items-center gap-3 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                <span className="font-medium">{p.name}</span>
                <span className="text-muted-foreground">· {p.count} actif{p.count > 1 ? "s" : ""}</span>
                <span className="ml-auto font-semibold">{euros(p.mrr)}</span>
              </div>
            ))}
            <p className="border-t pt-2 text-[11px] text-muted-foreground">
              Estimation — prix repères dérivés des modules activés (à valider).
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel + Adoption + Alertes */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Filter className="h-4 w-4 text-primary" /> Funnel d&apos;acquisition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {funnelSteps.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="w-36 shrink-0 truncate text-xs text-muted-foreground" title={s.label}>
                  {s.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(4, (s.value / funnelMax) * 100)}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs font-medium">{s.value}</span>
              </div>
            ))}
            <p className="border-t pt-2 text-[11px] text-muted-foreground">
              Taux de conversion global : <span className="font-semibold text-foreground">{funnel.tauxConversion}%</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" /> Adoption des modules avancés
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {adoption.slice(0, 7).map((a) => (
              <div key={a.key} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-xs text-muted-foreground" title={a.label}>
                  {a.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${a.pct}%` }} />
                </div>
                <span className="w-14 shrink-0 text-right text-xs font-medium">
                  {a.count}/{totals.organismes}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> À traiter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {alerts.essais.length === 0 && alerts.suspendus.length === 0 && alerts.inactifs.length === 0 && (
              <p className="text-sm text-muted-foreground">Rien à signaler — tout est à jour. 🎉</p>
            )}
            {alerts.essais.map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50/60 p-2.5 text-sm">
                <Badge className="bg-amber-500/10 text-amber-700">Essai</Badge>
                <Link href={`/console/${r.id}`} className="font-medium hover:underline">{r.nom}</Link>
                <ConvertButton id={r.id} className="ml-auto" />
              </div>
            ))}
            {alerts.inactifs.slice(0, 4).map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-md border bg-muted/30 p-2.5 text-sm">
                <Badge variant="secondary">Sans activité</Badge>
                <Link href={`/console/${r.id}`} className="font-medium hover:underline">{r.nom}</Link>
                <span className="ml-auto text-xs text-muted-foreground">0 candidat · 0 session</span>
              </div>
            ))}
            {alerts.suspendus.map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50/50 p-2.5 text-sm">
                <Badge className="bg-rose-500/10 text-rose-700">Suspendu</Badge>
                <Link href={`/console/${r.id}`} className="font-medium hover:underline">{r.nom}</Link>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Derniers organismes */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 py-3">
          <CardTitle className="text-sm">Organismes récents</CardTitle>
          <Link href="/console/organismes" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            Tout voir <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {rows.slice(0, 5).map((r) => (
            <Link
              key={r.id}
              href={`/console/${r.id}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-2 py-2 text-sm hover:bg-muted"
            >
              <span className="font-medium">{r.nom}</span>
              <Badge className={cn("text-[11px]", STATUT_BADGE[r.statut])}>{r.statut}</Badge>
              <span className="text-xs text-muted-foreground">{r.planName}</span>
              <span className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{r.userCount}</span>
                <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />{r.candidatCount}</span>
                <span className="w-16 text-right font-medium text-foreground">{r.mrr ? euros(r.mrr) : "—"}</span>
              </span>
            </Link>
          ))}
          {rows.length === 0 && (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <MoonStar className="h-7 w-7 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Aucun organisme pour le moment.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
