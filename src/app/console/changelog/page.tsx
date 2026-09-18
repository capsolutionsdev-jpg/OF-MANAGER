import { PageHeader } from "@/components/ui/page-header";
import { listReleasesForConsole } from "@/lib/changelog-data";
import { ChangelogManager } from "@/components/console/changelog-manager";

export const dynamic = "force-dynamic";

export default async function ConsoleChangelogPage() {
  const releases = await listReleasesForConsole();
  const serialized = releases.map((r) => ({
    id: r.id,
    version: r.version,
    name: r.name,
    releasedAt: r.releasedAt ? r.releasedAt.toISOString() : null,
    entries: r.entries.map((e) => ({
      id: e.id,
      category: e.category,
      title: e.title,
      body: e.body,
      audience: e.audience,
      order: e.order,
    })),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Mises à jour"
        subtitle="Journal des versions. Les versions publiées apparaissent aux clients dans « Nouveautés » ; les entrées « Interne » restent visibles ici seulement."
      />
      <ChangelogManager releases={serialized} />
    </div>
  );
}
