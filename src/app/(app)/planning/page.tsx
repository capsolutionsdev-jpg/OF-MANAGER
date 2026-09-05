import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  CalendarDays,
  Plus,
  MapPin,
  User,
  Users,
  UserCog,
  DoorOpen,
  type LucideIcon,
} from "lucide-react";
import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ o?: string }>;
}) {
  await requireSection("planning");
  const db = await getTenantDb();
  const sp = await searchParams;
  const offset = sp.o ? parseInt(sp.o, 10) : 0;

  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  const dow = (monday.getDay() + 6) % 7; // 0 = lundi
  monday.setDate(monday.getDate() - dow + offset * 7);
  const weekEnd = new Date(monday);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const sessions = await db.session.findMany({
    where: {
      statut: { not: "ANNULEE" },
      dateDebut: { lt: weekEnd },
      dateFin: { gte: monday },
    },
    include: {
      formation: { select: { titre: true } },
      formateurs: { select: { prenom: true, nom: true } },
      salle: { select: { nom: true, couleur: true } },
      // Séances réellement planifiées de la semaine (pour ne pas afficher une
      // occupation continue sur tout l'intervalle quand la session est espacée).
      _count: { select: { seances: true, inscriptions: true } },
      seances: {
        where: { date: { gte: monday, lt: weekEnd } },
        select: { date: true },
      },
    },
    orderBy: { dateDebut: "asc" },
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const onDay = (d: Date) =>
    sessions.filter((s) => {
      // Session planifiée par séances → présente uniquement les jours de séance.
      if (s._count.seances > 0) {
        return s.seances.some((se) => sameDay(new Date(se.date), d));
      }
      // Aucune séance générée → repli sur la plage dateDebut → dateFin.
      const ds = new Date(s.dateDebut);
      ds.setHours(0, 0, 0, 0);
      const df = new Date(s.dateFin);
      df.setHours(0, 0, 0, 0);
      return d >= ds && d <= df;
    });

  const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const today = new Date();

  // Indicateurs de la semaine (barre du bas).
  const placesDisponibles = sessions.reduce(
    (sum, s) => sum + Math.max(0, s.nbPlaces - s._count.inscriptions),
    0,
  );
  const formateursMobilises = new Set(
    sessions.flatMap((s) => s.formateurs.map((f) => `${f.prenom} ${f.nom}`)),
  ).size;
  const sallesUtilisees = new Set(
    sessions.map((s) => s.salle?.nom).filter((n): n is string => Boolean(n)),
  ).size;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planning général"
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-primary" />
            Semaine du {fmt(monday)} au {fmt(days[6])}
          </span>
        }
      >
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            aria-label="Semaine précédente"
            render={<Link href={`/planning?o=${offset - 1}`} />}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={cn(offset === 0 && "border-primary/40 text-primary")}
            render={<Link href="/planning" />}
          >
            <CalendarDays className="mr-1.5 h-4 w-4" /> Cette semaine
          </Button>
          <Button
            size="sm"
            variant="outline"
            aria-label="Semaine suivante"
            render={<Link href={`/planning?o=${offset + 1}`} />}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button render={<Link href="/sessions/nouvelle" />}>
          <Plus className="mr-2 h-4 w-4" /> Nouvelle session
        </Button>
      </PageHeader>

      {sessions.length === 0 && (
        <Card>
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CalendarRange className="h-8 w-8" />
            </span>
            <p className="font-semibold">Aucune session cette semaine</p>
            <p className="text-sm text-muted-foreground">
              Naviguez vers une autre semaine ou planifiez une session.
            </p>
          </div>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {days.map((d, i) => {
          const items = onDay(d);
          const isToday = sameDay(d, today);
          return (
            <div key={i} className="space-y-2">
              {/* En-tête de jour : carte avec compteur, aujourd'hui en couleur pleine. */}
              <div
                className={cn(
                  "relative rounded-xl border px-3 py-2 text-center",
                  isToday
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "bg-card",
                )}
              >
                <p className="text-sm font-semibold leading-tight">{JOURS[i]}</p>
                <p
                  className={cn(
                    "text-xs",
                    isToday ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {d.getDate()}/{d.getMonth() + 1}
                </p>
                <span
                  className={cn(
                    "absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums",
                    isToday
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {items.length}
                </span>
              </div>
              {items.length === 0 ? (
                <p className="px-2 text-center text-xs text-muted-foreground">—</p>
              ) : (
                items.map((s) => (
                  <Link
                    key={s.id}
                    href={`/sessions/${s.id}`}
                    className="block rounded-xl border border-l-4 bg-card p-2.5 shadow-sm transition hover:bg-muted/40"
                    style={{ borderLeftColor: s.salle?.couleur ?? "#2C53C0" }}
                  >
                    <p className="text-sm font-semibold leading-tight">{s.formation.titre}</p>
                    {s.horaires && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{s.horaires}</p>
                    )}
                    <div className="mt-2 space-y-1 border-t pt-2">
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{s.salle?.nom ?? s.lieu ?? "Salle non définie"}</span>
                      </p>
                      {s.formateurs.length > 0 && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {s.formateurs.map((f) => `${f.prenom} ${f.nom}`).join(", ")}
                          </span>
                        </p>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          );
        })}
      </div>

      {/* Indicateurs de la semaine */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-border">
          <Stat icon={CalendarDays} tone="primary" value={sessions.length} label={`Session${sessions.length > 1 ? "s" : ""} planifiée${sessions.length > 1 ? "s" : ""}`} />
          <Stat icon={Users} tone="success" value={placesDisponibles} label={`Place${placesDisponibles > 1 ? "s" : ""} disponible${placesDisponibles > 1 ? "s" : ""}`} />
          <Stat icon={UserCog} tone="primary" value={formateursMobilises} label={`Formateur${formateursMobilises > 1 ? "s" : ""} mobilisé${formateursMobilises > 1 ? "s" : ""}`} />
          <Stat icon={DoorOpen} tone="warning" value={sallesUtilisees} label={`Salle${sallesUtilisees > 1 ? "s" : ""} utilisée${sallesUtilisees > 1 ? "s" : ""}`} />
        </div>
      </div>
    </div>
  );
}

/** Indicateur de la barre du bas : pastille d'icône + valeur + libellé. */
function Stat({
  icon: Icon,
  tone,
  value,
  label,
}: {
  icon: LucideIcon;
  tone: "primary" | "success" | "warning";
  value: number;
  label: string;
}) {
  const tones: Record<typeof tone, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
  };
  return (
    <div className="flex items-center gap-3 lg:px-6 lg:first:pl-0 lg:last:pr-0">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
        <p className="mt-1 truncate text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
