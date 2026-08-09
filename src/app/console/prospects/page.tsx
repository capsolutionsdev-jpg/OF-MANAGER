import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { LeadsViewSwitch } from "@/components/console/leads-view-switch";
import { LeadsImport } from "@/components/console/leads-import";
import type { LeadKanbanRow } from "@/components/console/leads-kanban";

export const dynamic = "force-dynamic";

export default async function ConsoleProspectsPage() {
  // Tâches ouvertes incluses pour la vue pipeline (compteur par carte).
  const leads = (await prisma.lead.findMany({
    orderBy: [{ lu: "asc" }, { createdAt: "desc" }],
    include: { tasks: { where: { done: false } } },
  })) as LeadKanbanRow[];

  const aTraiter = leads.filter((l) => l.statut === "NOUVEAU" || l.statut === "A_RAPPELER").length;
  const nouveaux = leads.filter((l) => !l.lu).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prospects"
        subtitle={`${leads.length} prospect${leads.length > 1 ? "s" : ""} issus du site · ${aTraiter} à rappeler${nouveaux ? ` · ${nouveaux} nouveau${nouveaux > 1 ? "x" : ""}` : ""}`}
      >
        <LeadsImport />
      </PageHeader>
      {leads.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
          Aucun prospect pour le moment. Les demandes via le formulaire de contact et de démo du site apparaîtront ici.
        </div>
      ) : (
        <LeadsViewSwitch leads={leads} />
      )}
    </div>
  );
}
