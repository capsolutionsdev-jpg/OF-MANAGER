import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { CircuitsList, type CircuitRow } from "@/components/automatisations/circuits-list";

export const dynamic = "force-dynamic";

export default async function CircuitsPage() {
  const { db } = await requireTenant();
  const circuits = await db.circuit.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { steps: true } } },
  });
  const rows: CircuitRow[] = circuits.map((c) => ({
    id: c.id,
    nom: c.nom,
    description: c.description,
    actif: c.actif,
    nbEtapes: c._count.steps,
  }));

  return (
    <div className="space-y-6">
      <Link href="/automatisations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Automatisations
      </Link>
      <PageHeader
        title="Circuits d'automatisation"
        subtitle="Composez vos propres parcours automatisés : e-mails, documents, évaluations et satisfaction, envoyés au bon moment à vos apprenants, entreprises et formateurs."
      />
      <CircuitsList circuits={rows} />
    </div>
  );
}
