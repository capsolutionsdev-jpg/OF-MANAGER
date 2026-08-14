import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";
import { requireTenant } from "@/lib/tenant";
import { filterFormationsByOrgConfig } from "@/lib/get-formations-for-organisme";
import { getCurrentOrganisme } from "@/lib/org";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ImportCatalogueOfficielButton } from "@/components/formations/import-catalogue-officiel-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MODALITE_LABELS } from "@/lib/validators/formation";

export default async function FormationsPage() {
  const { db, organismeId } = await requireTenant();
  const allFormations = await db.formation.findMany({
    where: { isArchived: false },
    orderBy: { titre: "asc" },
    include: { _count: { select: { sessions: true } } },
  });
  const formations = await filterFormationsByOrgConfig(organismeId, allFormations);

  // Le catalogue officiel (source capacademy.fr) est propre à CAP Compétences.
  const org = await getCurrentOrganisme();
  const capId = process.env.VITRINE_ORGANISME_ID;
  const estCap = !capId || org?.id === capId;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Formations"
        subtitle={`Catalogue — ${formations.length} formation${formations.length > 1 ? "s" : ""} active${formations.length > 1 ? "s" : ""}`}
      >
        {estCap && <ImportCatalogueOfficielButton />}
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
        <Card>
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
                {formations.map((f) => (
                  <TableRow key={f.id} className="transition-colors hover:bg-muted/40">
                    <TableCell className="font-medium">
                      <Link href={`/formations/${f.id}`} className="hover:underline">
                        {f.titre}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{f.reference}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{MODALITE_LABELS[f.modalite]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{f.duree ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {f.tarif ? `${Number(f.tarif)} € HT` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{f._count.sessions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
