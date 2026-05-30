import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MODALITE_LABELS,
  ACADEMY_LABELS,
  ACADEMY_ORDER,
} from "@/lib/validators/formation";
import { SESSION_STATUT_LABELS } from "@/lib/validators/session";

const ETATS = [
  { key: "ENCOURS", label: "En cours" },
  { key: "AVENIR", label: "À venir" },
  { key: "PASSEE", label: "Passées" },
] as const;

export default async function SessionsPage() {
  const sessions = await prisma.session.findMany({
    orderBy: { dateDebut: "asc" },
    include: { formation: true, _count: { select: { inscriptions: true } } },
  });

  const now = new Date();
  const etat = (s: (typeof sessions)[number]) =>
    s.dateFin < now ? "PASSEE" : s.dateDebut > now ? "AVENIR" : "ENCOURS";
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
          <p className="text-sm text-muted-foreground">
            {sessions.length} session{sessions.length > 1 ? "s" : ""}, organisée
            {sessions.length > 1 ? "s" : ""} par état et par académie.
          </p>
        </div>
        <Button render={<Link href="/sessions/nouvelle" />}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle session
        </Button>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Aucune session programmée</p>
            <p className="text-sm text-muted-foreground">
              Planifiez votre première session de formation.
            </p>
          </div>
        </Card>
      ) : (
        ETATS.map((et) => {
          let inState = sessions.filter((s) => etat(s) === et.key);
          if (inState.length === 0) return null;
          if (et.key === "PASSEE") inState = [...inState].reverse();

          const acaGroups = [
            ...ACADEMY_ORDER.map((a) => ({
              key: a as string,
              titre: ACADEMY_LABELS[a],
              items: inState.filter((s) => s.formation.academy === a),
            })),
            {
              key: "AUTRE",
              titre: "Non classées",
              items: inState.filter((s) => !s.formation.academy),
            },
          ].filter((g) => g.items.length > 0);

          return (
            <section key={et.key} className="space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                {et.label}
                <Badge variant="secondary">{inState.length}</Badge>
              </h2>
              {acaGroups.map((g) => (
                <Card key={g.key}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm text-muted-foreground">
                      {g.titre}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Formation</TableHead>
                          <TableHead>Dates</TableHead>
                          <TableHead>Lieu</TableHead>
                          <TableHead>Modalité</TableHead>
                          <TableHead>Places</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {g.items.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">
                              <Link
                                href={`/sessions/${s.id}`}
                                className="hover:underline"
                              >
                                {s.formation.titre}
                              </Link>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {fmt(s.dateDebut)} → {fmt(s.dateFin)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {s.lieu ?? "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {MODALITE_LABELS[s.modalite]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {s._count.inscriptions}/{s.nbPlaces}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {SESSION_STATUT_LABELS[s.statut]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}
