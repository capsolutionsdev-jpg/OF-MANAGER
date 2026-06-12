import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
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

export default async function FormationsPage() {
  const formations = await prisma.formation.findMany({
    where: { isArchived: false },
    orderBy: { titre: "asc" },
    include: { _count: { select: { sessions: true } } },
  });

  // Regroupement par académie (ordre fixe + "Non classées" à la fin).
  type Groupe = { key: string; titre: string; items: typeof formations };
  const groupes: Groupe[] = [
    ...ACADEMY_ORDER.map((a) => ({
      key: a as string,
      titre: ACADEMY_LABELS[a],
      items: formations.filter((f) => f.academy === a),
    })),
    {
      key: "AUTRE",
      titre: "Non classées",
      items: formations.filter((f) => !f.academy),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Formations"
        subtitle={`Catalogue — ${formations.length} formation${formations.length > 1 ? "s" : ""} active${formations.length > 1 ? "s" : ""}, classée${formations.length > 1 ? "s" : ""} par académie`}
      >
        <Button render={<Link href="/formations/nouvelle" />}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle formation
        </Button>
      </PageHeader>

      {formations.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Aucune formation au catalogue</p>
            <p className="text-sm text-muted-foreground">
              Créez votre première formation.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupes.map((g) => (
            <Card key={g.key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {g.titre}
                  <Badge variant="secondary">{g.items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titre</TableHead>
                      <TableHead>Référence</TableHead>
                      <TableHead>Modalité</TableHead>
                      <TableHead>Durée</TableHead>
                      <TableHead>Tarif</TableHead>
                      <TableHead>Sessions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.items.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/formations/${f.id}`}
                            className="hover:underline"
                          >
                            {f.titre}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {f.reference}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {MODALITE_LABELS[f.modalite]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {f.duree ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {f.tarif ? `${Number(f.tarif)} € HT` : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {f._count.sessions}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
