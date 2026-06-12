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
import { PageHeader } from "@/components/ui/page-header";
import {
  MODALITE_LABELS,
  ACADEMY_LABELS,
  ACADEMY_ORDER,
} from "@/lib/validators/formation";
import { SESSION_STATUT_LABELS } from "@/lib/validators/session";

// Catégories d'affichage (basé sur les dates ET le statut)
const ETATS = [
  {
    key: "ENCOURS",
    label: "En cours",
    badge: "bg-emerald-500/10 text-emerald-700",
  },
  {
    key: "AVENIR",
    label: "À venir",
    badge: "bg-blue-500/10 text-blue-700",
  },
  {
    key: "PASSEE",
    label: "Passées",
    badge: "bg-muted text-muted-foreground",
  },
  {
    key: "ARCHIVEE",
    label: "Archivées",
    badge: "bg-red-500/10 text-red-700",
  },
] as const;

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const sessions = await prisma.session.findMany({
    orderBy: { dateDebut: "asc" },
    include: {
      formation: true,
      formateurs: { select: { prenom: true, nom: true } },
      _count: { select: { inscriptions: true } },
    },
  });

  const now = new Date();

  function etat(s: (typeof sessions)[number]): (typeof ETATS)[number]["key"] {
    if (s.statut === "ANNULEE") return "ARCHIVEE";
    if (s.dateFin < now) return "PASSEE";
    if (s.dateDebut > now) return "AVENIR";
    return "ENCOURS";
  }

  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sessions"
        subtitle={`${sessions.length} session${sessions.length > 1 ? "s" : ""} au total`}
      >
        <Button render={<Link href="/sessions/nouvelle" />}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle session
        </Button>
      </PageHeader>

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
          // Passées et Archivées : les plus récentes en premier
          if (et.key === "PASSEE" || et.key === "ARCHIVEE")
            inState = [...inState].reverse();

          // Sous-groupes par académie
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
                <Badge className={et.badge}>{inState.length}</Badge>
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
                          <TableHead className="hidden md:table-cell">
                            Formateur(s)
                          </TableHead>
                          <TableHead className="hidden lg:table-cell">
                            Lieu
                          </TableHead>
                          <TableHead>Modalité</TableHead>
                          <TableHead className="w-36">Places</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {g.items.map((s) => {
                          const pct = s.nbPlaces > 0 ? Math.round((s._count.inscriptions / s.nbPlaces) * 100) : 0;
                          const barColor = pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-blue-500" : "bg-amber-500";
                          return (
                          <TableRow key={s.id} className="hover:bg-muted/40">
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
                            <TableCell className="hidden text-muted-foreground md:table-cell">
                              {s.formateurs.length > 0
                                ? s.formateurs
                                    .map((f) => `${f.prenom} ${f.nom}`)
                                    .join(", ")
                                : "—"}
                            </TableCell>
                            <TableCell className="hidden text-muted-foreground lg:table-cell">
                              {s.lieu ?? "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {MODALITE_LABELS[s.modalite]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {s._count.inscriptions}/{s.nbPlaces}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {SESSION_STATUT_LABELS[s.statut]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                          );
                        })}
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
