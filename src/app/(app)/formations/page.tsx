import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
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
  const db = await getTenantDb();
  const formations = await db.formation.findMany({
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
          <EmptyState
            icon={BookOpen}
            title="Aucune formation au catalogue"
            description="Créez votre première formation : programme, tarif, pièces attendues et documents se génèrent ensuite automatiquement."
            actionLabel="Créer une formation"
            actionHref="/formations/nouvelle"
          />
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
                <Table className="stagger-rows">
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
