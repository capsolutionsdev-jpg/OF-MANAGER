import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewVeilleDialog } from "@/components/qualiopi/new-veille-dialog";
import { VeilleTable, type VeilleRow } from "@/components/qualiopi/veille-table";

export const dynamic = "force-dynamic";

export default async function VeillePage() {
  const db = await getTenantDb();
  const entrees = await db.veilleEntree.findMany({ orderBy: { date: "desc" } });

  const rows: VeilleRow[] = entrees.map((e) => ({
    id: e.id,
    type: e.type,
    date: e.date.toISOString(),
    source: e.source,
    sujet: e.sujet,
    resume: e.resume,
    action: e.action,
    lien: e.lien,
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/qualiopi"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-3 w-3" /> Conformité Qualiopi
        </Link>
        <PageHeader
          title="Registre de veille"
          subtitle="Veille légale, métiers et pédagogique, datée et suivie d'actions (indicateurs 23-24-25)."
        >
          <NewVeilleDialog />
        </PageHeader>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registre ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <VeilleTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
