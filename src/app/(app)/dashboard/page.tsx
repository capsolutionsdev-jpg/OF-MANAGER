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
  AlertTriangle,
  FileWarning,
  MessageSquareWarning,
} from "lucide-react";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
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

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`bar-anim h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Gauge({ pct }: { pct: number }) {
  const r = 50;
  const c = 2 * Math.PI * r;
  const filled = (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <svg viewBox="0 0 120 120" className="h-36 w-36" role="img" aria-label={`Remplissage ${pct}%`}>
      <circle cx="60" cy="60" r={r} fill="none" className="stroke-muted" strokeWidth="12" />
      <circle
        cx="60" cy="60" r={r} fill="none"
        className="gauge-anim stroke-primary" strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${filled} ${c}`} transform="rotate(-90 60 60)"
      />
      <text x="60" y="58" textAnchor="middle" className="fill-foreground" fontSize="24" fontWeight="600">{pct}%</text>
      <text x="60" y="77" textAnchor="middle" className="fill-muted-foreground" fontSize="9">remplissage</text>
    </svg>
  );
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: "a créé", UPDATE: "a modifié", DELETE: "a supprimé", ARCHIVE: "a archivé",
  GENERATE_DOC: "a généré un document pour", SEND_EMAIL: "a envoyé un e-mail —",
  SIGN: "a signé", LOGIN: "s'est connecté",
};
const ENTITY_LABELS: Record<string, string> = {
  Candidat: "le candidat", Session: "la session", Formation: "la formation",
  Inscription: "l'inscription", Formateur: "le formateur", User: "le compte",
  Reclamation: "la réclamation", Entreprise: "le client pro",
};

const JOURS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

export default async function DashboardPage() {
  const db = await getTenantDb();
  const now = new Date();
  const session = await auth();
  const prenom = (session?.user?.name ?? "").split(" ")[0] || "à vous";
  const aujourdhui = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  // Bornes de la semaine courante (lundi → dimanche)
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const [
    candidats, apprenants, formations, sessionsAVenir,
    parStatut, parFinancement, parSource,
    sessionsActives, enAttente, prochaines, logs,
    reclamationsOuvertes, inscriptionsDossier, weekSessions,
  ] = await Promise.all([
    db.candidat.count({ where: { statut: { not: "ARCHIVE" } } }),
    db.apprenant.count(),
    db.formation.count({ where: { isArchived: false } }),
    db.session.count({ where: { dateDebut: { gte: now } } }),
    db.inscription.groupBy({ by: ["statut"], _count: { _all: true } }),
    db.inscription.groupBy({ by: ["financementType"], _count: { _all: true } }),
    db.candidat.groupBy({ by: ["sourceConnaissance"], _count: { _all: true } }),
    db.session.findMany({
      where: { statut: { not: "ANNULEE" }, dateFin: { gte: now } },
      orderBy: { dateDebut: "asc" },
      include: {
        formation: { select: { titre: true } },
        // Jauge de remplissage : on ne compte QUE les inscriptions non annulées.
        _count: { select: { inscriptions: { where: { statut: { not: "ANNULEE" } } } } },
      },
    }),
    db.inscription.findMany({
      where: { statut: "EN_ATTENTE" },
      orderBy: { createdAt: "desc" }, take: 15,
      include: {
        candidat: { select: { id: true, prenom: true, nom: true, telephone: true, email: true } },
        session: { include: { formation: { select: { titre: true } } } },
      },
    }),
    db.session.findMany({
      where: { dateDebut: { gte: now } }, orderBy: { dateDebut: "asc" }, take: 6,
      include: { formation: true, _count: { select: { inscriptions: true } } },
    }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { name: true } } } }),
    db.reclamation.count({ where: { statut: { not: "CLOTUREE" } } }),
    db.inscription.findMany({
      // Compteur « dossiers à compléter » : inscriptions actives/à venir seulement
      // (ensemble borné) → pas de plafond silencieux.
      where: { statut: { not: "ANNULEE" }, session: { dateFin: { gte: now } } },
      select: { piecesRecues: true, session: { select: { formation: { select: { piecesAttendues: true } } } } },
    }),
    db.session.findMany({
      where: { statut: { not: "ANNULEE" }, dateDebut: { lte: weekEnd }, dateFin: { gte: weekStart } },
      include: { formation: { select: { titre: true } }, _count: { select: { inscriptions: true } } },
      orderBy: { dateDebut: "asc" },
    }),
  ]);

  // Jauge : remplissage global des sessions en cours / à venir
  const totalPlaces = sessionsActives.reduce((a, s) => a + s.nbPlaces, 0);
  const totalInscrits = sessionsActives.reduce((a, s) => a + s._count.inscriptions, 0);
  const remplissage = totalPlaces > 0 ? Math.round((totalInscrits / totalPlaces) * 100) : 0;

  // « À traiter »
  const piecesManquantes = inscriptionsDossier.filter((i) => {
    const att = i.session.formation.piecesAttendues ?? [];
    return att.some((p) => !i.piecesRecues.includes(p));
  }).length;

  const finMax = Math.max(1, ...parFinancement.map((s) => s._count._all));
  const sourceMax = Math.max(1, ...parSource.map((s) => s._count._all));
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");
  const fmtDateHeure = (d: Date) =>
    d.toLocaleDateString("fr-FR") + " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const kpis = [
    { label: "Candidats", value: candidats, icon: Users, tint: "blue" as const },
    { label: "Apprenants", value: apprenants, icon: GraduationCap, tint: "emerald" as const },
    { label: "Sessions à venir", value: sessionsAVenir, icon: CalendarClock, tint: "amber" as const },
    { label: "Formations", value: formations, icon: BookOpen, tint: "violet" as const },
  ];

  // 5 jours ouvrés de la semaine (lun → ven)
  const days = Array.from({ length: 5 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dStart = new Date(d); dStart.setHours(0, 0, 0, 0);
    const dEnd = new Date(d); dEnd.setHours(23, 59, 59, 999);
    const sessions = weekSessions.filter((s) => s.dateDebut <= dEnd && s.dateFin >= dStart);
    const isToday = d.toDateString() === now.toDateString();
    return { date: d, label: JOURS[i], num: d.getDate(), sessions, isToday };
  });

  // Résolution des noms pour le journal d'activité
  const byType: Record<string, Set<string>> = {};
  for (const l of logs) if (l.entityId) (byType[l.entityType] ??= new Set()).add(l.entityId);
  const names = new Map<string, string>();
  async function resolve(type: string, ids: string[]) {
    if (ids.length === 0) return;
    if (type === "Candidat") {
      const r = await db.candidat.findMany({ where: { id: { in: ids } }, select: { id: true, prenom: true, nom: true } });
      r.forEach((x) => names.set(`Candidat:${x.id}`, `${x.prenom} ${x.nom}`));
    } else if (type === "Session") {
      const r = await db.session.findMany({ where: { id: { in: ids } }, select: { id: true, formation: { select: { titre: true } }, dateDebut: true } });
      r.forEach((x) => names.set(`Session:${x.id}`, `${x.formation.titre} (${fmt(x.dateDebut)})`));
    } else if (type === "Formation") {
      const r = await db.formation.findMany({ where: { id: { in: ids } }, select: { id: true, titre: true } });
      r.forEach((x) => names.set(`Formation:${x.id}`, x.titre));
    } else if (type === "Inscription") {
      const r = await db.inscription.findMany({ where: { id: { in: ids } }, select: { id: true, candidat: { select: { prenom: true, nom: true } } } });
      r.forEach((x) => names.set(`Inscription:${x.id}`, `${x.candidat.prenom} ${x.candidat.nom}`));
    } else if (type === "Formateur") {
      const r = await db.formateur.findMany({ where: { id: { in: ids } }, select: { id: true, prenom: true, nom: true } });
      r.forEach((x) => names.set(`Formateur:${x.id}`, `${x.prenom} ${x.nom}`));
    }
  }
  await Promise.all(Object.entries(byType).map(([t, set]) => resolve(t, [...set])));

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bonjour, {prenom}</h1>
          <p className="mt-0.5 text-sm capitalize text-muted-foreground">{aujourdhui} — centre de pilotage</p>
        </div>
        <Link
          href="/candidats/nouveau"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
        >
          <Users className="h-4 w-4" /> Nouveau candidat
        </Link>
      </div>

      {/* COCKPIT : jauge + KPIs + à traiter */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr_auto]">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-5">
            <Gauge pct={remplissage} />
            <p className="mt-1 text-xs text-muted-foreground">{totalInscrits} / {totalPlaces} places réservées</p>
          </CardContent>
        </Card>

        <div className="stagger grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          {kpis.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} tint={s.tint} />
          ))}
        </div>

        <Card className="lg:w-64">
          <CardHeader>
            <CardTitle className="text-base">À traiter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="#a-relancer" className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2 text-sm transition-colors hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20">
              <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400"><BellRing className="h-3.5 w-3.5" /> En attente</span>
              <span className="font-semibold text-rose-700 dark:text-rose-400">{enAttente.length}</span>
            </Link>
            <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm dark:bg-amber-500/10">
              <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400"><FileWarning className="h-3.5 w-3.5" /> Pièces manquantes</span>
              <span className="font-semibold text-amber-700 dark:text-amber-400">{piecesManquantes}</span>
            </div>
            <Link href="/qualiopi/reclamations" className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted">
              <span className="flex items-center gap-1.5 text-muted-foreground"><MessageSquareWarning className="h-3.5 w-3.5" /> Réclamations</span>
              <span className="font-semibold">{reclamationsOuvertes}</span>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* PLANNING DE LA SEMAINE */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4" /> Planning de la semaine
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {fmt(weekStart)} → {fmt(weekEnd)}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 border-t sm:grid-cols-3 lg:grid-cols-5">
            {days.map((d, i) => (
              <div
                key={i}
                className={`min-h-[110px] border-b border-r p-2 last:border-r-0 ${d.isToday ? "bg-primary/5" : ""}`}
              >
                <div className={`mb-2 text-xs ${d.isToday ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                  {d.label} {d.num}
                </div>
                <div className="space-y-1.5">
                  {d.sessions.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground/50">—</span>
                  ) : (
                    d.sessions.map((s) => (
                      <Link
                        key={s.id}
                        href={`/sessions/${s.id}`}
                        className="block rounded-md bg-blue-50 px-2 py-1.5 transition-colors hover:bg-blue-100 dark:bg-blue-500/15 dark:hover:bg-blue-500/25"
                      >
                        <div className="truncate text-[11px] font-medium text-blue-700 dark:text-blue-300">
                          {s.formation.titre}
                        </div>
                        <div className="text-[10px] text-blue-600/80 dark:text-blue-400/80">
                          {s.horaires ? `${s.horaires.split("–")[0].trim()} · ` : ""}
                          {s._count.inscriptions}/{s.nbPlaces}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Répartitions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><PieChart className="h-4 w-4" /> Inscriptions par statut</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {parStatut.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune inscription.</p>
            ) : (
              parStatut.map((s) =>
                s.statut === "EN_ATTENTE" ? (
                  <Link key={s.statut} href="#a-relancer" className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm transition-colors hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20">
                    <span className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400"><Clock className="h-3.5 w-3.5" /> En attente</span>
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">{s._count._all} · à relancer <ArrowRight className="h-3.5 w-3.5" /></span>
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
          <CardHeader><CardTitle className="text-base">Inscriptions par financement</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {parFinancement.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune inscription.</p>
            ) : (
              parFinancement.map((s) => (
                <Bar key={s.financementType ?? "none"} label={s.financementType ? FINANCEMENT_LABELS[s.financementType] : "Non précisé"} value={s._count._all} max={finMax} color="bg-emerald-500" />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-4 w-4" /> Provenance des prospects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {parSource.filter((s) => s.sourceConnaissance).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune source renseignée.</p>
            ) : (
              parSource.filter((s) => s.sourceConnaissance).sort((a, b) => b._count._all - a._count._all).map((s) => (
                <Bar key={s.sourceConnaissance} label={s.sourceConnaissance!} value={s._count._all} max={sourceMax} color="bg-violet-500" />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* À relancer */}
      <Card id="a-relancer">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellRing className="h-4 w-4 text-amber-600" /> À relancer — inscriptions en attente ({enAttente.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enAttente.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4 text-emerald-600" /> Aucune inscription en attente.</p>
          ) : (
            <ul className="divide-y">
              {enAttente.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <Link href={`/candidats/${i.candidat.id}`} className="font-medium hover:underline">{i.candidat.prenom} {i.candidat.nom}</Link>
                    <span className="ml-2 text-xs text-muted-foreground">{i.session.formation.titre} · {fmt(i.session.dateDebut)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {i.candidat.telephone && <a href={`tel:${i.candidat.telephone}`} className="text-primary hover:underline">{i.candidat.telephone}</a>}
                    {i.candidat.email && (
                      <a href={`mailto:${i.candidat.email}?subject=${encodeURIComponent(`Votre inscription — ${i.session.formation.titre}`)}`} className="rounded-md border px-2 py-1 font-medium text-primary hover:bg-muted">Relancer par e-mail</a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Prochaines sessions + activité */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Prochaines sessions</span>
              <Link href="/sessions" className="text-xs font-normal text-primary hover:underline">Voir tout</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prochaines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune session programmée à venir.</p>
            ) : (
              <ul className="space-y-3">
                {prochaines.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3">
                    <Link href={`/sessions/${s.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">{s.formation.titre}</Link>
                    <span className="text-xs text-muted-foreground">{fmt(s.dateDebut)}</span>
                    <Badge variant="outline" className="shrink-0">{s._count.inscriptions}/{s.nbPlaces}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" /> Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune activité.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {logs.map((log) => {
                  const who = log.user?.name ?? "Système";
                  const initials = who.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
                  const actionTxt = ACTION_LABELS[log.action] ?? log.action.toLowerCase();
                  const entityTxt = ENTITY_LABELS[log.entityType] ?? log.entityType;
                  const cible = log.entityId ? names.get(`${log.entityType}:${log.entityId}`) : null;
                  return (
                    <li key={log.id} className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">{initials || "•"}</span>
                      <div className="min-w-0 leading-snug">
                        <span><span className="font-semibold">{who}</span> {actionTxt} {entityTxt}{cible && <span className="font-medium"> {cible}</span>}</span>
                        <div className="text-xs text-muted-foreground">{fmtDateHeure(log.createdAt)}</div>
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
