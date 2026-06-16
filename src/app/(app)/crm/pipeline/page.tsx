import Link from "next/link";
import { ArrowLeft, Table2, TrendingUp } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export default async function PipelinePage() {
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

  // Taux de conversion : gagnés / (gagnés + perdus + en cours)
  const total = candidats.length;
  const gagnes = candidats.filter((c) => c.crmStage === "GAGNE").length;
  const perdus = candidats.filter((c) => c.crmStage === "PERDU").length;
  const tauxConversion = total > 0 ? Math.round((gagnes / total) * 100) : 0;
  const pipeValue = candidats
    .filter((c) => c.crmStage !== "PERDU" && c.crmStage !== "GAGNE")
    .reduce((a, c) => a + (c.valeurEstimee ? Number(c.valeurEstimee) : 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/crm"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Vue liste
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <TrendingUp className="h-6 w-6" /> Pipeline commercial
          </h1>
          <p className="text-sm text-muted-foreground">
            Glissez-déposez les prospects entre les étapes.
          </p>
        </div>
        <Button variant="outline" render={<Link href="/crm" />}>
          <Table2 className="mr-2 h-4 w-4" /> Vue liste
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Prospects actifs" value={String(total)} />
        <Kpi label="Gagnés" value={String(gagnes)} sub={`${perdus} perdu(s)`} />
        <Kpi label="Taux de conversion" value={`${tauxConversion}%`} sub="gagnés / total" />
        <Kpi
          label="Valeur du pipeline"
          value={pipeValue > 0 ? `${pipeValue.toLocaleString("fr-FR")} €` : "—"}
          sub="opportunités en cours"
        />
      </div>

      {total === 0 ? (
        <Card>
          <div className="p-12 text-center text-sm text-muted-foreground">
            Aucun prospect. Créez-en depuis la vue liste.
          </div>
        </Card>
      ) : (
        <PipelineBoard initial={cards} />
      )}
    </div>
  );
}
