import { CalendarDays, MapPin } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const STATUT_LABELS: Record<string, string> = {
  PLANIFIEE: "Planifiée", CONFIRMEE: "Confirmée", EN_COURS: "En cours",
  TERMINEE: "Terminée", ANNULEE: "Annulée",
};

export default async function MesSessionsPage() {
  const db = await getTenantDb();
  const session = await auth();
  const formateur = session?.user?.id
    ? await db.formateur.findUnique({ where: { userId: session.user.id }, select: { id: true } })
    : null;

  if (!formateur) {
    return (
      <div className="space-y-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <CalendarDays className="h-6 w-6" /> Mes sessions
        </h1>
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
          Aucun espace formateur associé à ce compte. Contactez l&apos;organisme de formation.
        </CardContent></Card>
      </div>
    );
  }

  const sessions = await db.session.findMany({
    where: { formateurs: { some: { id: formateur.id } }, isArchived: false },
    orderBy: { dateDebut: "desc" },
    select: {
      id: true, dateDebut: true, dateFin: true, lieu: true, horaires: true, statut: true,
      formation: { select: { titre: true } },
      _count: { select: { inscriptions: true } },
    },
  });

  const now = new Date();
  const aVenir = sessions.filter((s) => s.dateFin >= now);
  const passees = sessions.filter((s) => s.dateFin < now);
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

  function Row({ s }: { s: (typeof sessions)[number] }) {
    return (
      <li className="rounded-lg border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">{s.formation.titre}</p>
          <Badge variant="outline">{STATUT_LABELS[s.statut] ?? s.statut}</Badge>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />
            {fmt(s.dateDebut)} → {fmt(s.dateFin)}{s.horaires ? ` · ${s.horaires}` : ""}</span>
          {s.lieu && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{s.lieu}</span>}
          <span>{s._count.inscriptions} stagiaire{s._count.inscriptions > 1 ? "s" : ""}</span>
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <CalendarDays className="h-6 w-6" /> Mes sessions
        </h1>
        <p className="text-sm text-muted-foreground">Vos interventions à venir et passées.</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">À venir ({aVenir.length})</h2>
        {aVenir.length === 0
          ? <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">Aucune session à venir.</p>
          : <ul className="space-y-2">{aVenir.map((s) => <Row key={s.id} s={s} />)}</ul>}
      </section>

      {passees.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Passées ({passees.length})</h2>
          <ul className="space-y-2">{passees.map((s) => <Row key={s.id} s={s} />)}</ul>
        </section>
      )}
    </div>
  );
}
