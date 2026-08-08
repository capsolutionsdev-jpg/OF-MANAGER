import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { getFormateurDetail } from "@/lib/formateurs/detail";
import { FormateurDetailHeader } from "@/components/formateurs/formateur-detail-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function FormateurPlanningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getFormateurDetail(id);
  if (!detail) notFound();

  const { f } = detail;

  const now = new Date();
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");
  const etatBadge = (dDeb: Date, dFin: Date) =>
    dFin < now
      ? { label: "Passée", variant: "secondary" as const }
      : dDeb > now
        ? { label: "À venir", variant: "default" as const }
        : { label: "En cours", variant: "outline" as const };

  // À venir (et en cours) d'abord, triées de la plus proche à la plus lointaine ;
  // puis les passées, de la plus récente à la plus ancienne.
  const aVenir = f.sessions
    .filter((s) => s.dateFin >= now)
    .sort((a, b) => a.dateDebut.getTime() - b.dateDebut.getTime());
  const passees = f.sessions
    .filter((s) => s.dateFin < now)
    .sort((a, b) => b.dateDebut.getTime() - a.dateDebut.getTime());

  const groupes = [
    { key: "a-venir", titre: "À venir", items: aVenir },
    { key: "passees", titre: "Passées", items: passees },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <FormateurDetailHeader
        formateur={{ id: f.id, prenom: f.prenom, nom: f.nom }}
        active="planning"
        planningCount={f.sessions.length}
        facturesCount={f.factures.length}
      />

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <CalendarDays className="h-5 w-5" /> Formations à animer ({f.sessions.length})
        </h2>
        {f.sessions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Ce formateur n&apos;est affecté à aucune session. Affectez-le depuis
              une fiche session (bouton « Modifier »).
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groupes.map((g) => (
              <Card key={g.key}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm text-muted-foreground">
                    {g.titre} ({g.items.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {g.items.map((s) => {
                    const e = etatBadge(s.dateDebut, s.dateFin);
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 border-b py-2 last:border-0"
                      >
                        <Link
                          href={`/sessions/${s.id}`}
                          className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                        >
                          {s.formation.titre}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {fmt(s.dateDebut)} → {fmt(s.dateFin)}
                        </span>
                        <Badge variant={e.variant} className="shrink-0">
                          {e.label}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
