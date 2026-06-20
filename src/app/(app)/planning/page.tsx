import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
      const ds = new Date(s.dateDebut);
      ds.setHours(0, 0, 0, 0);
      const df = new Date(s.dateFin);
      df.setHours(0, 0, 0, 0);
      return d >= ds && d <= df;
    });

  const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const today = new Date();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planning général"
        subtitle={`Semaine du ${fmt(monday)} au ${fmt(days[6])}`}
      >
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" render={<Link href={`/planning?o=${offset - 1}`} />}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={offset === 0 ? "default" : "outline"} render={<Link href="/planning" />}>
            Cette semaine
          </Button>
          <Button size="sm" variant="outline" render={<Link href={`/planning?o=${offset + 1}`} />}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </PageHeader>

      {sessions.length === 0 && (
        <Card>
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <CalendarRange className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Aucune session cette semaine</p>
            <p className="text-sm text-muted-foreground">Naviguez vers une autre semaine ou planifiez une session.</p>
          </div>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {days.map((d, i) => {
          const items = onDay(d);
          const isToday = sameDay(d, today);
          return (
            <div key={i} className="space-y-2">
              <div className={`rounded-md px-2 py-1 text-sm font-medium ${isToday ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {JOURS[i]} {d.getDate()}/{d.getMonth() + 1}
              </div>
              {items.length === 0 ? (
                <p className="px-2 text-xs text-muted-foreground">—</p>
              ) : (
                items.map((s) => (
                  <Link
                    key={s.id}
                    href={`/sessions/${s.id}`}
                    className="block rounded-lg border-l-4 bg-card p-2 shadow-sm transition hover:bg-muted/40"
                    style={{ borderLeftColor: s.salle?.couleur ?? "#2C53C0" }}
                  >
                    <p className="text-sm font-medium leading-tight">{s.formation.titre}</p>
                    {s.horaires && <p className="text-xs text-muted-foreground">{s.horaires}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.salle?.nom ?? s.lieu ?? "Salle non définie"}
                    </p>
                    {s.formateurs.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {s.formateurs.map((f) => `${f.prenom} ${f.nom}`).join(", ")}
                      </p>
                    )}
                  </Link>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
