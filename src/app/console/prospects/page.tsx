import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { LeadsTable, type LeadRow } from "@/components/console/leads-table";

export const dynamic = "force-dynamic";

export default async function ConsoleProspectsPage() {
  const leads = (await prisma.lead.findMany({
    orderBy: [{ lu: "asc" }, { createdAt: "desc" }],
  })) as LeadRow[];

  const aTraiter = leads.filter((l) => l.statut === "NOUVEAU" || l.statut === "A_RAPPELER").length;
  const nouveaux = leads.filter((l) => !l.lu).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prospects"
        subtitle={`${leads.length} prospect${leads.length > 1 ? "s" : ""} issus du site · ${aTraiter} à rappeler${nouveaux ? ` · ${nouveaux} nouveau${nouveaux > 1 ? "x" : ""}` : ""}`}
      />
      {leads.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
          Aucun prospect pour le moment. Les demandes via le formulaire de contact et de démo du site apparaîtront ici.
        </div>
      ) : (
        <LeadsTable leads={leads} />
      )}
    </div>
  );
}
