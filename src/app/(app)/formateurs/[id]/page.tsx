import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ACADEMY_LABELS, ACADEMY_ORDER } from "@/lib/validators/formation";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{value && value !== "" ? value : "—"}</dd>
    </div>
  );
}

export default async function FormateurDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const f = await prisma.formateur.findUnique({
    where: { id },
    include: {
      sessions: { include: { formation: true }, orderBy: { dateDebut: "asc" } },
      formations: { select: { id: true, titre: true }, orderBy: { titre: "asc" } },
    },
  });
  if (!f) notFound();

  const now = new Date();
  const etatBadge = (dDeb: Date, dFin: Date) =>
    dFin < now
      ? { label: "Passée", variant: "secondary" as const }
      : dDeb > now
        ? { label: "À venir", variant: "default" as const }
        : { label: "En cours", variant: "outline" as const };
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

  const groupes = [
    ...ACADEMY_ORDER.map((a) => ({
      key: a as string,
      titre: ACADEMY_LABELS[a],
      items: f.sessions.filter((s) => s.formation.academy === a),
    })),
    {
      key: "AUTRE",
      titre: "Non classées",
      items: f.sessions.filter((s) => !s.formation.academy),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/formateurs"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux formateurs
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            {f.prenom} {f.nom}
          </h1>
          <Button variant="outline" render={<Link href={`/formateurs/${f.id}/modifier`} />}>
            <Pencil className="mr-2 h-4 w-4" /> Modifier
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coordonnées</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Field label="Email" value={f.email} />
            <Field label="Téléphone" value={f.telephone} />
            <Field label="Spécialités" value={f.specialites} />
            <Field
              label="Expérience"
              value={f.experienceAnnees ? `${f.experienceAnnees} ans` : null}
            />
          </dl>

          {(f.academies.length > 0 || f.formations.length > 0) && (
            <div className="mt-4 space-y-3 border-t pt-4">
              {f.academies.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Académies :
                  </span>
                  {f.academies.map((a) => (
                    <Badge key={a} variant="secondary">
                      {ACADEMY_LABELS[a]}
                    </Badge>
                  ))}
                </div>
              )}
              {f.formations.length > 0 && (
                <div className="text-sm">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Formations enseignées :
                  </span>{" "}
                  {f.formations.map((x) => x.titre).join(" · ")}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
