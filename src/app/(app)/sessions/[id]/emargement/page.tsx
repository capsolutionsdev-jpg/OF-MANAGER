import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, CalendarPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { genererSeances } from "@/lib/actions/emargement-actions";
import { PresenceCell } from "@/components/emargement/presence-cell";

export default async function EmargementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await prisma.session.findUnique({
    where: { id },
    include: {
      formation: true,
      seances: { orderBy: { date: "asc" }, include: { presences: true } },
      inscriptions: { include: { candidat: true } },
    },
  });
  if (!s) notFound();

  const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const participants = s.inscriptions.filter((i) => i.apprenantId);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/sessions/${s.id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la session
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Émargement</h1>
        <p className="text-sm text-muted-foreground">
          {s.formation.titre} — {s.inscriptions.length} inscrit
          {s.inscriptions.length > 1 ? "s" : ""}.
        </p>
      </div>

      {s.seances.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <CalendarPlus className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Aucune séance générée</p>
            <p className="text-sm text-muted-foreground">
              Générez automatiquement une séance par jour sur la période de la session.
              Les dossiers apprenants des inscrits seront créés au passage.
            </p>
            <form action={genererSeances.bind(null, s.id)}>
              <Button type="submit" className="mt-2">
                <CalendarPlus className="mr-2 h-4 w-4" /> Générer les séances
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {s.seances.map((seance) => (
            <Card key={seance.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base capitalize">{fmt(seance.date)}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/emargement/${seance.id}`} target="_blank" />}
                >
                  <FileText className="mr-2 h-4 w-4" /> Feuille d&apos;émargement
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {participants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun participant. Inscrivez des candidats à la session.
                  </p>
                ) : (
                  participants.map((insc) => {
                    const presence = seance.presences.find(
                      (p) => p.apprenantId === insc.apprenantId,
                    );
                    return (
                      <div
                        key={insc.id}
                        className="flex items-center justify-between gap-3 border-b py-2 last:border-0"
                      >
                        <span className="text-sm">
                          {insc.candidat.prenom} {insc.candidat.nom}
                        </span>
                        <PresenceCell
                          seanceId={seance.id}
                          apprenantId={insc.apprenantId as string}
                          statut={presence?.statut ?? null}
                        />
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
