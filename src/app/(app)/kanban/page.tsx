import Link from "next/link";
import { Columns3, Table2 } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  PipelineBoard,
  type PipelineCard,
} from "@/components/crm/pipeline-board";

export const dynamic = "force-dynamic";

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default async function KanbanPage() {
  const db = await getTenantDb();
  const candidats = await db.candidat.findMany({
    where: { statut: { not: "ARCHIVE" } },
    include: {
      formationSouhaitee: { select: { titre: true } },
      assignedTo: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const cards: PipelineCard[] = candidats.map((c) => ({
    id: c.id,
    nom: c.nom,
    prenom: c.prenom,
    formationTitre: c.formationSouhaitee?.titre ?? null,
    valeurEstimee: c.valeurEstimee ? Number(c.valeurEstimee) : null,
    assigneeName: c.assignedTo?.name ?? null,
    tags: c.tags,
    crmStage: c.crmStage,
    relanceDate: c.relanceDate ? c.relanceDate.toISOString() : null,
  }));

  const total = candidats.length;
  const gagnes = candidats.filter((c) => c.crmStage === "GAGNE").length;
  const perdus = candidats.filter((c) => c.crmStage === "PERDU").length;
  const tauxConversion = total > 0 ? Math.round((gagnes / total) * 100) : 0;
  const pipeValue = candidats
    .filter((c) => c.crmStage !== "PERDU" && c.crmStage !== "GAGNE")
    .reduce((a, c) => a + (c.valeurEstimee ? Number(c.valeurEstimee) : 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline Kanban"
        subtitle="Glissez-déposez les opportunités d'une étape à l'autre."
      >
        <Button variant="outline" render={<Link href="/candidats" />}>
          <Table2 className="mr-2 h-4 w-4" /> Vue liste
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Opportunités" value={String(total)} />
        <Kpi label="Gagnées" value={String(gagnes)} sub={`${perdus} perdue(s)`} />
        <Kpi label="Taux de conversion" value={`${tauxConversion}%`} sub="gagnées / total" />
        <Kpi
          label="Valeur du pipeline"
          value={pipeValue > 0 ? `${pipeValue.toLocaleString("fr-FR")} €` : "—"}
          sub="opportunités en cours"
        />
      </div>

      {total === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <Columns3 className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Aucune opportunité pour le moment</p>
            <p className="text-sm text-muted-foreground">
              Créez un prospect pour le voir apparaître dans le pipeline.
            </p>
          </div>
        </Card>
      ) : (
        <PipelineBoard initial={cards} />
      )}
    </div>
  );
}
