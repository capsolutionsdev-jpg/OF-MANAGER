import Link from "next/link";
import {
  Users,
  BookOpen,
  CalendarClock,
  GraduationCap,
  PieChart,
  History,
  BellRing,
  Megaphone,
  ArrowRight,
  Clock,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { INSCRIPTION_STATUT_LABELS } from "@/lib/validators/inscription";
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";

function Bar({
  label,
  value,
  max,
  color,
  href,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  href?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const inner = (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className={href ? "font-medium text-primary" : "text-muted-foreground"}>
          {label}
          {href && " →"}
        </span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded transition-opacity hover:opacity-80">
      {inner}
    </Link>
  ) : (
    inner
  );
}

// Libellés lisibles pour le journal d'activité.
const ACTION_LABELS: Record<string, string> = {
  CREATE: "a créé",
  UPDATE: "a modifié",
  DELETE: "a supprimé",
  ARCHIVE: "a archivé",
  GENERATE_DOC: "a généré un document pour",
  SEND_EMAIL: "a envoyé un e-mail —",
  SIGN: "a signé",
  LOGIN: "s'est connecté",
};
const ENTITY_LABELS: Record<string, string> = {
  Candidat: "le candidat",
  Session: "la session",
  Formation: "la formation",
  Inscription: "l'inscription",
  Formateur: "le formateur",
  User: "le compte",
  Reclamation: "la réclamation",
  Entreprise: "le client pro",
};

export default async function DashboardPage() {
  const now = new Date();
  const session = await auth();
  const prenom = (session?.user?.name ?? "").split(" ")[0] || "à vous";
  const aujourdhui = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const [
    candidats,
    apprenants,
    formations,
    sessionsAVenir,
    parStatut,
    parFinancement,
    parSource,
    sessionsRemplissage,
    enAttente,
    prochaines,
    logs,
  ] = await Promise.all([
    prisma.candidat.count(),
    prisma.apprenant.count(),
    prisma.formation.count({ where: { isArchived: false } }),
    prisma.session.count({ where: { dateDebut: { gte: now } } }),
    prisma.inscription.groupBy({ by: ["statut"], _count: { _all: true } }),
    prisma.inscription.groupBy({ by: ["financementType"], _count: { _all: true } }),
    prisma.candidat.groupBy({ by: ["sourceConnaissance"], _count: { _all: true } }),
    prisma.session.findMany({
      where: { statut: { not: "ANNULEE" }, dateFin: { gte: now } },
      orderBy: { dateDebut: "asc" },
      take: 8,
      include: { formation: { select: { titre: true } }, _count: { select: { inscriptions: true } } },
    }),
    prisma.inscription.findMany({
      where: { statut: "EN_ATTENTE" },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        candidat: { select: { id: true, prenom: true, nom: true, telephone: true, email: true } },
        session: { include: { formation: { select: { titre: true } } } },
      },
    }),
    prisma.session.findMany({
      where: { dateDebut: { gte: now } },
      orderBy: { dateDebut: "asc" },
      take: 5,
      include: { formation: true, _count: { select: { inscriptions: true } } },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { user: { select: { name: true } } },
    }),
  ]);

  const kpis = [
    { label: "Candidats", value: candidats, icon: Users, tint: "blue" as const },
    { label: "Apprenants", value: apprenants, icon: GraduationCap, tint: "emerald" as const },
    { label: "Sessions à venir", value: sessionsAVenir, icon: CalendarClock, tint: "amber" as const },
    { label: "Formations actives", value: formations, icon: BookOpen, tint: "violet" as const },
  ];

  const finMax = Math.max(1, ...parFinancement.map((s) => s._count._all));
  const sourceMax = Math.max(1, ...parSource.map((s) => s._count._all));
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");
  const fmtDateHeure = (d: Date) =>
    d.toLocaleDateString("fr-FR") + " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  // ── Résolution des noms pour le journal d'activité ──
  const byType: Record<string, Set<string>> = {};
  for (const l of logs) {
    if (l.entityId) (byType[l.entityType] ??= new Set()).add(l.entityId);
  }
  const names = new Map<string, string>(); // `${type}:${id}` → libellé
  async function resolve(type: string, ids: string[]) {
    if (ids.length === 0) return;
    if (type === "Candidat") {
      const r = await prisma.candidat.findMany({ where: { id: { in: ids } }, select: { id: true, prenom: true, nom: true } });
      r.forEach((x) => names.set(`Candidat:${x.id}`, `${x.prenom} ${x.nom}`));
    } else if (type === "Session") {
      const r = await prisma.session.findMany({ where: { id: { in: ids } }, select: { id: true, formation: { select: { titre: true } }, dateDebut: true } });
      r.forEach((x) => names.set(`Session:${x.id}`, `${x.formation.titre} (${fmt(x.dateDebut)})`));
    } else if (type === "Formation") {
      const r = await prisma.formation.findMany({ where: { id: { in: ids } }, select: { id: true, titre: true } });
      r.forEach((x) => names.set(`Formation:${x.id}`, x.titre));
    } else if (type === "Inscription") {
      const r = await prisma.inscription.findMany({ where: { id: { in: ids } }, select: { id: true, candidat: { select: { prenom: true, nom: true } } } });
      r.forEach((x) => names.set(`Inscription:${x.id}`, `${x.candidat.prenom} ${x.candidat.nom}`));
    } else if (type === "Formateur") {
      const r = await prisma.formateur.findMany({ where: { id: { in: ids } }, select: { id: true, prenom: true, nom: true } });
      r.forEach((x) => names.set(`Formateur:${x.id}`, `${x.prenom} ${x.nom}`));
    }
  }
  await Promise.all(Object.entries(byType).map(([t, set]) => resolve(t, [...set])));

  return (
    <div className="space-y-6">
      {/* En-tête : salutation */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bonjour, {prenom}</h1>
          <p className="mt-0.5 text-sm capitalize text-muted-foreground">{aujourdhui}</p>
        </div>
        <Link
          href="/candidats/nouveau"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:opacity-90"
        >
          <Users className="h-4 w-4" /> Nouveau candidat
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            tint={s.tint}
          />
        ))}
      </div>

      {/* Taux de remplissage PAR SESSION */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Taux de remplissage par session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessionsRemplissage.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune session en cours ou à venir.</p>
          ) : (
            sessionsRemplissage.map((s) => {
              const pct = s.nbPlaces > 0 ? Math.round((s._count.inscriptions / s.nbPlaces) * 100) : 0;
              const couleur = pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-blue-500" : "bg-amber-500";
              return (
                <Link key={s.id} href={`/sessions/${s.id}`} className="block rounded transition-opacity hover:opacity-80">
                  <div className="flex justify-between text-sm">
                    <span className="truncate font-medium">{s.formation.titre}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {fmt(s.dateDebut)} · {s._count.inscriptions}/{s.nbPlaces} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${couleur}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Répartitions : statut · financement · provenance */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-4 w-4" /> Inscriptions par statut
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {parStatut.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune inscription.</p>
            ) : (
              parStatut.map((s) =>
                s.statut === "EN_ATTENTE" ? (
                  <Link
                    key={s.statut}
                    href="#a-relancer"
                    className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm transition-colors hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20"
                  >
                    <span className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                      <Clock className="h-3.5 w-3.5" /> En attente
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                      {s._count._all} · à relancer <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                ) : (
                  <div key={s.statut} className="flex items-center justify-between px-3 py-1.5 text-sm">
                    <span className="text-muted-foreground">{INSCRIPTION_STATUT_LABELS[s.statut]}</span>
                    <span className="font-semibold">{s._count._all}</span>
                  </div>
                ),
              )
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
                  label={s.financementType ? FINANCEMENT_LABELS[s.financementType] : "Non précisé"}
                  value={s._count._all}
                  max={finMax}
                  color="bg-emerald-500"
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4" /> Provenance des prospects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {parSource.filter((s) => s.sourceConnaissance).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune source renseignée.</p>
            ) : (
              parSource
                .filter((s) => s.sourceConnaissance)
                .sort((a, b) => b._count._all - a._count._all)
                .map((s) => (
                  <Bar
                    key={s.sourceConnaissance}
                    label={s.sourceConnaissance!}
                    value={s._count._all}
                    max={sourceMax}
                    color="bg-violet-500"
                  />
                ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* À relancer (inscriptions en attente) */}
      <Card id="a-relancer">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellRing className="h-4 w-4 text-amber-600" /> À relancer — inscriptions en attente ({enAttente.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enAttente.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune inscription en attente. 👍</p>
          ) : (
            <ul className="divide-y">
              {enAttente.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <Link href={`/candidats/${i.candidat.id}`} className="font-medium hover:underline">
                      {i.candidat.prenom} {i.candidat.nom}
                    </Link>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {i.session.formation.titre} · {fmt(i.session.dateDebut)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {i.candidat.telephone && (
                      <a href={`tel:${i.candidat.telephone}`} className="text-primary hover:underline">
                        {i.candidat.telephone}
                      </a>
                    )}
                    {i.candidat.email && (
                      <a
                        href={`mailto:${i.candidat.email}?subject=${encodeURIComponent(`Votre inscription — ${i.session.formation.titre}`)}`}
                        className="rounded-md border px-2 py-1 font-medium text-primary hover:bg-muted"
                      >
                        Relancer par e-mail
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Prochaines sessions + activité détaillée */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" /> Prochaines sessions
              </span>
              <Link href="/sessions" className="text-xs font-normal text-primary hover:underline">
                Voir tout
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prochaines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune session programmée à venir.</p>
            ) : (
              <ul className="space-y-3">
                {prochaines.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3">
                    <Link href={`/sessions/${s.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
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
              <ul className="space-y-3 text-sm">
                {logs.map((log) => {
                  const who = log.user?.name ?? "Système";
                  const initials = who
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  const actionTxt = ACTION_LABELS[log.action] ?? log.action.toLowerCase();
                  const entityTxt = ENTITY_LABELS[log.entityType] ?? log.entityType;
                  const cible = log.entityId ? names.get(`${log.entityType}:${log.entityId}`) : null;
                  return (
                    <li key={log.id} className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                        {initials || "•"}
                      </span>
                      <div className="min-w-0 leading-snug">
                        <span>
                          <span className="font-semibold">{who}</span>{" "}
                          {actionTxt} {entityTxt}
                          {cible && <span className="font-medium"> {cible}</span>}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {fmtDateHeure(log.createdAt)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
