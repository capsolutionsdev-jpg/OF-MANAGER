import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";
import { aiConfigured } from "@/lib/ai";
import { PageHeader } from "@/components/ui/page-header";
import { AssistantPanel, type AiCandidat } from "@/components/ai/assistant-panel";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  await requireSection("ia");
  const db = await getTenantDb();
  const candidats = await db.candidat.findMany({
    where: { statut: { not: "ARCHIVE" } },
    select: { id: true, prenom: true, nom: true },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });
  const options: AiCandidat[] = candidats.map((c) => ({
    id: c.id,
    label: `${c.prenom} ${c.nom}`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assistant IA"
        subtitle="Rédaction de relances, qualification de prospects et résumés — propulsé par Claude."
      />
      <AssistantPanel candidats={options} configured={aiConfigured()} />
    </div>
  );
}
