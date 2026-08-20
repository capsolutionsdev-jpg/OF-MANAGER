import Link from "next/link";
import { ArrowLeft, BarChart3, TrendingUp, Eye, Globe } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Trafic du site vitrine" };
export const dynamic = "force-dynamic";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function TraficPage() {
  const db = await getTenantDb();
  const d7 = daysAgo(7);
  const d30 = daysAgo(30);

  const [total30, total7, totalToday, topPages, topReferers, recent7] =
    await Promise.all([
      db.pageVue.count({ where: { createdAt: { gte: d30 } } }),
      db.pageVue.count({ where: { createdAt: { gte: d7 } } }),
      db.pageVue.count({ where: { createdAt: { gte: startOfToday() } } }),
      db.pageVue.groupBy({
        by: ["path"],
        where: { createdAt: { gte: d30 } },
        _count: { _all: true },
        orderBy: { _count: { path: "desc" } },
        take: 12,
      }),
      db.pageVue.groupBy({
        by: ["referer"],
        where: { createdAt: { gte: d30 }, referer: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { referer: "desc" } },
        take: 8,
      }),
      db.pageVue.findMany({
        where: { createdAt: { gte: d7 } },
        select: { createdAt: true },
        take: 20000,
      }),
    ]);

  // Répartition par jour sur 7 jours (bucket côté serveur, sans SQL brut).
  const jours: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const jour = daysAgo(i);
    const key = jour.toISOString().slice(0, 10);
    const count = recent7.filter(
      (v) => v.createdAt.toISOString().slice(0, 10) === key,
    ).length;
    jours.push({
      label: jour.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }),
      count,
    });
  }
  const maxJour = Math.max(1, ...jours.map((j) => j.count));

  const stats = [
    { icon: Eye, label: "Vues aujourd'hui", value: totalToday },
    { icon: TrendingUp, label: "Vues (7 derniers jours)", value: total7 },
    { icon: BarChart3, label: "Vues (30 derniers jours)", value: total30 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/site-vitrine"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au cockpit
        </Link>
        <PageHeader
          title="Trafic du site vitrine"
          subtitle="Fréquentation de votre site vitrine — mesure privacy-first, sans cookie ni donnée personnelle."
        />
      </div>

      {total30 === 0 ? (
        <Card>
          <EmptyState
            icon={Globe}
            title="Aucune donnée de trafic pour l'instant"
            description="Le suivi démarre dès que le site public envoie ses vues. Vérifiez que le site est déployé et que la variable VITRINE_ORGANISME_ID est bien définie."
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((s) => (
              <Card key={s.label}>
                <CardContent className="flex items-center gap-4 py-5">
                  <div className="rounded-xl bg-muted p-2.5">
                    <s.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{s.value}</div>
                    <div className="text-sm text-muted-foreground">{s.label}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Répartition 7 jours */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">7 derniers jours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-2" style={{ height: 140 }}>
                {jours.map((j) => (
                  <div key={j.label} className="flex flex-1 flex-col items-center gap-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      {j.count}
                    </div>
                    <div
                      className="w-full rounded-t-md bg-primary/80"
                      style={{ height: `${(j.count / maxJour) * 100}px`, minHeight: 2 }}
                    />
                    <div className="text-[11px] capitalize text-muted-foreground">
                      {j.label}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top pages */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Pages les plus vues (30 j)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topPages.map((p) => (
                  <div key={p.path} className="flex items-center justify-between gap-3">
                    <span className="truncate font-mono text-xs text-muted-foreground">
                      {p.path}
                    </span>
                    <span className="shrink-0 text-sm font-semibold">
                      {p._count._all}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top sources */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Sources de trafic (30 j)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topReferers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune source externe identifiée (accès directs ou navigation
                    interne).
                  </p>
                ) : (
                  topReferers.map((r) => (
                    <div
                      key={r.referer}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="truncate text-sm text-muted-foreground">
                        {r.referer}
                      </span>
                      <span className="shrink-0 text-sm font-semibold">
                        {r._count._all}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
