import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listPublishedClientReleases } from "@/lib/changelog-data";
import { CATEGORY_LABELS, type ReleaseCategory } from "@/lib/changelog";

export const dynamic = "force-dynamic";

const CATEGORY_VARIANT: Record<ReleaseCategory, "success" | "info" | "warning" | "destructive"> = {
  NOUVEAUTE: "success",
  AMELIORATION: "info",
  CORRECTION: "warning",
  SECURITE: "destructive",
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function NouveautesPage() {
  const releases = await listPublishedClientReleases();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Nouveautés" subtitle="Les dernières améliorations et corrections d'OF Manager." />

      {releases.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune nouveauté pour le moment.</p>
      ) : (
        releases.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                <span>v{r.version}</span>
                {r.name ? <span className="font-normal text-muted-foreground">— {r.name}</span> : null}
              </CardTitle>
              {r.releasedAt ? (
                <p className="text-xs text-muted-foreground">{formatDate(r.releasedAt)}</p>
              ) : null}
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {r.entries.map((e) => (
                  <li key={e.id} className="flex items-start gap-2.5">
                    <Badge variant={CATEGORY_VARIANT[e.category]} className="mt-0.5">
                      {CATEGORY_LABELS[e.category]}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{e.title}</p>
                      {e.body ? (
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{e.body}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
