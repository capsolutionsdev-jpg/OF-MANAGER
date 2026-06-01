import Link from "next/link";
import {
  Users,
  BookOpen,
  CalendarClock,
  GraduationCap,
  PieChart,
  History,
  ArrowRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INSCRIPTION_STATUT_LABELS } from "@/lib/validators/inscription";
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";
import { SESSION_STATUT_LABELS } from "@/lib/validators/session";

function Bar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const now = new Date();

  const [
    candidats,
    apprenants,
    formations,
    sessions,
    sessionsAVenir,
    inscriptionsTotal,
    parStatut,
    parFinancement,
    placesAgg,
    prochaines,
    logs,
  ] = await Promise.all([
    prisma.candidat.count(),
    prisma.apprenant.count(),
    prisma.formation.count({ where: { isArchived: false } }),
    prisma.session.count(),
    prisma.session.count({ where: { dateDebut: { gte: now } } }),
    prisma.inscription.count(),
    prisma.inscription.groupBy({ by: ["statut"], _count: { _all: true } }),
    prisma.inscription.groupBy({ by: ["financementType"], _count: { _all: true } }),
    prisma.session.aggregate({ _sum: { nbPlaces: true } }),
    prisma.session.findMany({
      where: { dateDebut: { gte: now } },
      orderBy: { dateDebut: "asc" },
      take: 5,
      include: { formation: true, _count: { select: { inscriptions: true } } },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: true },
    }),
  ]);

  const totalPlaces = placesAgg._sum.nbPlaces ?? 0;
  const remplissage =
    totalPlaces > 0 ? Math.round((inscriptionsTotal / totalPlaces) * 100) : 0;

  const kpis = [
    { label: "Candidats", value: candidats, icon: Users, color: "bg-blue-500/10 text-blue-600" },
    { label: "Apprenants", value: apprenants, icon: GraduationCap, color: "bg-emerald-500/10 text-emerald-600" },
    { label: "Sessions à venir", value: sessionsAVenir, icon: CalendarClock, color: "bg-amber-500/10 text-amber-600" },
    { label: "Formations actives", value: formations, icon: BookOpen, color: "bg-violet-500/10 text-violet-600" },
  ];

  const statutMax = Math.max(1, ...parStatut.map((s) => s._count._all));
  const finMax = Math.max(1, ...parFinancement.map((s) => s._count._all));
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-primary to-blue-600 p-6 text-primary-foreground shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="mt-1 text-sm text-primary-foreground/80">
          Vue d&apos;ensemble de l&apos;activité de CAP Compétences.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((s) => (
          <Card key={s.label} className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.color}`}
              >
                <s.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-3xl font-bold leading-none">{s.value}</div>
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {s.label}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Taux de remplissage + répartitions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Taux de remplissage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{remplissage}%</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {inscriptionsTotal} inscription{inscriptionsTotal > 1 ? "s" : ""} pour{" "}
              {totalPlaces} place{totalPlaces > 1 ? "s" : ""} au total.
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, remplissage)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-4 w-4" /> Inscriptions par statut
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {parStatut.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune inscription.</p>
            ) : (
              parStatut.map((s) => (
                <Bar
                  key={s.statut}
                  label={INSCRIPTION_STATUT_LABELS[s.statut]}
                  value={s._count._all}
                  max={statutMax}
                  color="bg-blue-500"
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inscriptions par financement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {parFinancement.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune inscription.</p>
            ) : (
              parFinancement.map((s) => (
                <Bar
                  key={s.financementType ?? "none"}
                  label={
                    s.financementType
                      ? FINANCEMENT_LABELS[s.financementType]
                      : "Non précisé"
                  }
                  value={s._count._all}
                  max={finMax}
                  color="bg-emerald-500"
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Prochaines sessions + activité */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" /> Prochaines sessions
              </span>
              <Link
                href="/sessions"
                className="text-xs font-normal text-primary hover:underline"
              >
                Voir tout
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prochaines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune session programmée à venir.
              </p>
            ) : (
              <ul className="space-y-3">
                {prochaines.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3">
                    <Link
                      href={`/sessions/${s.id}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                    >
                      {s.formation.titre}
                    </Link>
                    <span className="text-xs text-muted-foreground">{fmt(s.dateDebut)}</span>
                    <Badge variant="outline" className="shrink-0">
                      {s._count.inscriptions}/{s.nbPlaces}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" /> Activité récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune activité.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {logs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-center justify-between gap-3 border-b pb-2 last:border-0"
                  >
                    <span className="truncate">
                      <span className="font-medium">{log.action}</span>{" "}
                      <span className="text-muted-foreground">{log.entityType}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {log.createdAt.toLocaleDateString("fr-FR")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
