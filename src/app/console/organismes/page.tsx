import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { OrganismesTable } from "@/components/console/organismes-table";
import { getConsoleOverview } from "@/lib/console-stats";

export const dynamic = "force-dynamic";

export default async function OrganismesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { rows, totals } = await getConsoleOverview();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Organismes clients"
        subtitle={`${totals.organismes} instance${totals.organismes > 1 ? "s" : ""} · ${totals.actifs} active${totals.actifs > 1 ? "s" : ""} · ${totals.essais} en essai`}
      >
        <Button render={<Link href="/console/nouveau" />}>
          <Plus className="mr-2 h-4 w-4" /> Nouvel organisme
        </Button>
      </PageHeader>
      <OrganismesTable rows={rows} initialQuery={q ?? ""} />
    </div>
  );
}
