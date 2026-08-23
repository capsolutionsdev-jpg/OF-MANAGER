import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { LeadsViewSwitch } from "@/components/console/leads-view-switch";
import { LeadsImport } from "@/components/console/leads-import";
import { LeadManualAdd } from "@/components/console/lead-manual-add";
import type { LeadKanbanRow } from "@/components/console/leads-kanban";
import { STATUTS_A_TRAITER } from "@/components/console/lead-statut";

export const dynamic = "force-dynamic";

export default async function ConsoleProspectsPage() {
  // Tâches ouvertes incluses pour la vue pipeline (compteur par carte).
  const leads = (await prisma.lead.findMany({
    orderBy: [{ lu: "asc" }, { createdAt: "desc" }],
    include: { tasks: { where: { done: false } } },
  })) as LeadKanbanRow[];

  const aTraiter = leads.filter((l) => STATUTS_A_TRAITER.includes(l.statut)).length;
  const nouveaux = leads.filter((l) => !l.lu).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prospects"
        subtitle={`${leads.length} prospect${leads.length > 1 ? "s" : ""} issus du site · ${aTraiter} à traiter${nouveaux ? ` · ${nouveaux} nouveau${nouveaux > 1 ? "x" : ""}` : ""}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <LeadsImport />
          <LeadManualAdd />
        </div>
      </PageHeader>
      {leads.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
          Aucun prospect pour le moment. Importez vos fichiers de prospection, ajoutez un prospect manuellement, ou attendez les demandes du site.
        </div>
      ) : (
        <LeadsViewSwitch leads={leads} />
      )}
    </div>
  );
}
