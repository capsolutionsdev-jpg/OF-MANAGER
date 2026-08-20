import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Users,
  BookOpen,
  CalendarClock,
  GraduationCap,
  History,
  BellRing,
  ArrowRight,
  FileWarning,
  MessageSquareWarning,
  BarChart3,
} from "lucide-react";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { getCurrentOrganisme } from "@/lib/org";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCardV2 } from "@/components/dashboard/kpi-card-v2";
import { ConventionDialog } from "@/components/conventions/convention-dialog";
import { UsageCard } from "@/components/facturation/usage-card";
import { getOrgUsage } from "@/lib/usage";
import { withDbRetry } from "@/lib/db-retry";

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
  // Sécurité (défense en profondeur) : le tableau de bord est RÉSERVÉ au staff.
  // Un FORMATEUR / APPRENANT qui l'atteindrait par URL est renvoyé à son espace.
  if (session?.user && !["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"].includes(session.user.role)) {
    redirect(session.user.role === "APPRENANT" ? "/mon-espace" : "/mes-sessions");
  }
  // Prénom du titulaire. Pour l'ADMIN (représentant légal de l'OF), le compte est
  // souvent nommé « Administrateur » (générique) : on retombe alors sur le
  // représentant de l'organisme pour un accueil personnalisé.
  const org = await getCurrentOrganisme();
  const rawName = (session?.user?.name ?? "").trim();
  const generic = !rawName || /^administrateur$/i.test(rawName);
  const source = generic ? (org?.representant ?? rawName) : rawName;
  const prenom = source.trim().split(/\s+/)[0] || "à vous";
  const aujourdhui = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  // Consommation facturable du mois (quotas de la formule) — réservée à l'ADMIN,
  // titulaire qui pilote l'abonnement. cf. lib/usage.ts (facturation au volume).
  const usage =
    session?.user?.role === "ADMIN" && org
      ? await withDbRetry(() => getOrgUsage(org.id, org.formule))
      : null;

  // Bornes de la semaine courante (lundi → dimanche)
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const [
    candidats, apprenants, formations, sessionsAVenir,
    sessionsActives, enAttente, enAttenteTotal, prochaines, logs,
    reclamationsOuvertes, inscriptionsDossier, weekSessions,
  ] = await withDbRetry(() => Promise.all([
    db.candidat.count({ where: { statut: { not: "ARCHIVE" } } }),
    db.apprenant.count(),
    db.formation.count({ where: { isArchived: false } }),
    db.session.count({ where: { dateDebut: { gte: now } } }),
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
      orderBy: { createdAt: "desc" }, take: 5,
      include: {
        candidat: { select: { id: true, prenom: true, nom: true, telephone: true, email: true } },
        session: { include: { formation: { select: { titre: true } } } },
      },
    }),
    db.inscription.count({ where: { statut: "EN_ATTENTE" } }),
    db.session.findMany({
      where: { dateDebut: { gte: now } }, orderBy: { dateDebut: "asc" }, take: 5,
      include: { formation: true, _count: { select: { inscriptions: true } } },
    }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { user: { select: { name: true } } } }),
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
  ]));

  // Jauge : remplissage global des sessions en cours / à venir
  const totalPlaces = sessionsActives.reduce((a, s) => a + s.nbPlaces, 0);
  const totalInscrits = sessionsActives.reduce((a, s) => a + s._count.inscriptions, 0);
  const remplissage = totalPlaces > 0 ? Math.round((totalInscrits / totalPlaces) * 100) : 0;

  // « À traiter »
  const piecesManquantes = inscriptionsDossier.filter((i) => {
    const att = i.session.formation.piecesAttendues ?? [];
    return att.some((p) => !i.piecesRecues.includes(p));
  }).length;

  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");
  const fmtDateHeure = (d: Date) =>
    d.toLocaleDateString("fr-FR") + " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const kpis = [
    { label: "Candidats", value: candidats, icon: Users, tint: "violet" as const, seed: 3 },
    { label: "Apprenants", value: apprenants, icon: GraduationCap, tint: "emerald" as const, seed: 7 },
    { label: "Sessions à venir", value: sessionsAVenir, icon: CalendarClock, tint: "amber" as const, seed: 11 },
    { label: "Formations", value: formations, icon: BookOpen, tint: "blue" as const, seed: 17 },
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
  await withDbRetry(() => Promise.all(Object.entries(byType).map(([t, set]) => resolve(t, [...set]))));

  // Point d'entrée « Convention entreprise » (inscription groupée B2B) sur l'accueil,
  // à côté de « Commencer une inscription » — réservé au staff (#15).
  const estStaff = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"].includes(
    (session?.user?.role as string) ?? "",
  );
  // Données du dialog « Convention entreprise » (staff) : les deux requêtes sont
  // indépendantes → un seul aller-retour au lieu de deux en série.
  const staffData = estStaff
    ? await withDbRetry(() => Promise.all([
        db.entreprise.findMany({
          select: { id: true, raisonSociale: true },
          orderBy: { raisonSociale: "asc" },
        }),
        db.session.findMany({
          where: { isArchived: false, statut: { not: "ANNULEE" } },
          include: { formation: { select: { titre: true } } },
          orderBy: { dateDebut: "desc" },
          take: 100,
        }),
      ]))
    : null;
  const entreprisesConv = staffData?.[0] ?? [];
  const sessionsConvRaw = staffData?.[1] ?? [];
  const conventionSessions = sessionsConvRaw.map((s) => ({
    id: s.id,
    label: `${s.formation.titre} — ${s.dateDebut.toLocaleDateString("fr-FR")}${s.lieu ? ` (${s.lieu})` : ""}`,
  }));

  return (
    <div className="space-y-6">
      {/* ══════════ ROW 1 : Header + KPIs (col gauche) | À traiter (col droite) ══════════ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Col gauche : Bonjour + actions + KPIs */}
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Bonjour, {prenom} <span aria-hidden="true">👋</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Voici un aperçu de l&apos;activité de votre centre de formation.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <Button size="lg" className="w-full sm:w-auto" render={<Link href="/candidats/nouveau" />}>
                <Users className="mr-1.5 h-4 w-4" /> Commencer une inscription
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto" render={<Link href="/dashboard/statistiques" />}>
                <BarChart3 className="mr-1.5 h-4 w-4" /> Statistiques
              </Button>
              {estStaff && (
                <ConventionDialog entreprises={entreprisesConv} sessions={conventionSessions} />
              )}
            </div>
          </div>

          {/* 4 KPI cards — tuiles 2 colonnes sur mobile (façon widgets), 4 en desktop */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {kpis.map((s) => (
              <KpiCardV2
                key={s.label}
                label={s.label}
                value={s.value}
                icon={s.icon}
                tint={s.tint}
                seed={s.seed}
              />
            ))}
          </div>
        </div>

        {/* Col droite : À traiter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">À traiter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="#a-relancer"
              className="flex items-center justify-between rounded-xl bg-destructive/10 px-3 py-2.5 text-sm transition-colors hover:bg-destructive/20"
            >
              <span className="flex items-center gap-2 text-destructive">
                <BellRing className="h-4 w-4" /> En attente
              </span>
              <span className="flex items-center gap-1 font-semibold text-destructive">
                {enAttenteTotal} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
            <Link
              href="/candidats"
              className="flex items-center justify-between rounded-xl bg-warning/10 px-3 py-2.5 text-sm transition-colors hover:bg-warning/20"
            >
              <span className="flex items-center gap-2 text-warning">
                <FileWarning className="h-4 w-4" /> Pièces manquantes
              </span>
              <span className="flex items-center gap-1 font-semibold text-warning">
                {piecesManquantes} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
            <Link
              href="/qualiopi/reclamations"
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-muted"
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <MessageSquareWarning className="h-4 w-4" /> Réclamations
              </span>
              <span className="flex items-center gap-1 font-semibold">
                {reclamationsOuvertes} <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ══════════ ROW 2 : Remplissage | Consommation | Prochaines sessions ══════════ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Remplissage — jauge */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Remplissage des sessions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-2">
            <Gauge pct={remplissage} />
            <p className="mt-2 text-xs text-muted-foreground">
              {totalInscrits} / {totalPlaces} places réservées
            </p>
            <Link
              href="/sessions"
              className="mt-3 text-xs font-medium text-primary hover:underline"
            >
              Voir le détail →
            </Link>
          </CardContent>
        </Card>

        {/* Consommation du mois — carte UsageCard existante si ADMIN, sinon placeholder */}
        {usage ? (
          <UsageCard usage={usage} title="Ma consommation du mois" />
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ma consommation du mois</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Le suivi mensuel s&apos;affiche pour le compte titulaire de l&apos;abonnement.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Prochaines sessions */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-base">Prochaines sessions</CardTitle>
            <Link href="/sessions" className="text-xs font-medium text-primary hover:underline">
              Voir tout →
            </Link>
          </CardHeader>
          <CardContent>
            {prochaines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune session programmée à venir.</p>
            ) : (
              <ul className="space-y-3">
                {prochaines.slice(0, 3).map((s) => {
                  const jour = s.dateDebut.getDate();
                  const mois = s.dateDebut
                    .toLocaleDateString("fr-FR", { month: "short" })
                    .replace(".", "")
                    .toUpperCase();
                  const complet = s._count.inscriptions >= s.nbPlaces;
                  return (
                    <li key={s.id}>
                      <Link
                        href={`/sessions/${s.id}`}
                        className="flex items-center gap-3 rounded-xl px-2 py-2 -mx-2 transition-colors hover:bg-muted"
                      >
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-muted">
                          <span className="text-base font-bold leading-none text-foreground">{jour}</span>
                          <span className="text-[10px] font-medium text-muted-foreground">{mois}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {s.formation.titre}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {s._count.inscriptions} / {s.nbPlaces} places
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={complet ? "shrink-0 border-warning/40 text-warning" : "shrink-0 border-success/40 text-success"}
                        >
                          {complet ? "Complète" : "Ouverte"}
                        </Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══════════ ROW 3 : Cette semaine (2/3) | Activité récente (1/3) ══════════ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <div>
              <CardTitle className="text-base">Cette semaine</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {fmt(weekStart)} → {fmt(weekEnd)}
              </p>
            </div>
            <Link href="/planning" className="text-xs font-medium text-primary hover:underline">
              Voir le planning →
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 border-t sm:grid-cols-3 lg:grid-cols-5">
              {days.map((d, i) => (
                <div
                  key={i}
                  className={`min-h-[110px] border-b border-r p-3 last:border-r-0 ${d.isToday ? "bg-primary/5" : ""}`}
                >
                  <div
                    className={`mb-2 text-center text-xs ${d.isToday ? "font-semibold text-primary" : "text-muted-foreground"}`}
                  >
                    <div className="uppercase">{d.label.replace(".", "")}</div>
                    <div className="mt-0.5 text-lg font-semibold text-foreground">{d.num}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {d.sessions.length === 0
                        ? "0 session"
                        : `${d.sessions.length} session${d.sessions.length > 1 ? "s" : ""}`}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {d.sessions.slice(0, 2).map((s) => (
                      <Link
                        key={s.id}
                        href={`/sessions/${s.id}`}
                        className="block truncate rounded-md bg-primary/10 px-1.5 py-1 text-[10px] font-medium text-primary hover:bg-primary/20"
                      >
                        {s.formation.titre}
                      </Link>
                    ))}
                    {d.sessions.length > 2 && (
                      <p className="text-[10px] text-muted-foreground">+{d.sessions.length - 2}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activité récente */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-base">Activité récente</CardTitle>
            <Link href="/historique" className="text-xs font-medium text-primary hover:underline">
              Voir tout →
            </Link>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune activité récente.</p>
            ) : (
              <ul className="space-y-3">
                {logs.slice(0, 4).map((log) => {
                  const who = log.user?.name ?? "Système";
                  const actionTxt = ACTION_LABELS[log.action] ?? log.action.toLowerCase();
                  const entityTxt = ENTITY_LABELS[log.entityType] ?? log.entityType;
                  const cible = log.entityId
                    ? names.get(`${log.entityType}:${log.entityId}`)
                    : null;
                  return (
                    <li key={log.id} className="flex gap-2.5 text-sm">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <History className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1 leading-snug">
                        <p className="text-sm">
                          <span className="font-medium">{who}</span>{" "}
                          <span className="text-muted-foreground">
                            {actionTxt} {entityTxt}
                          </span>
                          {cible && <span className="font-medium"> {cible}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{fmtDateHeure(log.createdAt)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══════════ ROW 4 : À relancer (liste des inscriptions en attente) ══════════ */}
      {enAttente.length > 0 && (
        <Card id="a-relancer">
          <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="h-4 w-4 text-warning" /> À relancer ({enAttenteTotal})
            </CardTitle>
            <Link href="/crm" className="text-xs font-medium text-primary hover:underline">
              Voir tout →
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {enAttente.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
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
                      <a
                        href={`tel:${i.candidat.telephone}`}
                        className="text-primary hover:underline"
                      >
                        {i.candidat.telephone}
                      </a>
                    )}
                    {i.candidat.email && (
                      <a
                        href={`mailto:${i.candidat.email}?subject=${encodeURIComponent(`Votre inscription — ${i.session.formation.titre}`)}`}
                        className="rounded-md border border-border px-2 py-1 font-medium text-primary hover:bg-muted"
                      >
                        Relancer
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
