import { Building2, Link2 } from "lucide-react";
import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyAcceptLink } from "@/components/devis/copy-accept-link";
import { generatePortalLink, revokePortalLink } from "@/lib/actions/portal-actions";

export const dynamic = "force-dynamic";

export default async function PortailClientPage() {
  await requireSection("portail-client");
  const db = await getTenantDb();
  const entreprises = await db.entreprise.findMany({
    orderBy: { raisonSociale: "asc" },
    select: {
      id: true,
      raisonSociale: true,
      contactNom: true,
      portalToken: true,
      _count: { select: { inscriptions: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Espace client entreprise"
        subtitle="Donnez à vos clients B2B un accès self-service (lecture seule) à leurs salariés, conventions et factures."
      />

      <Card>
        <CardContent className="p-0">
          {entreprises.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Aucune entreprise cliente</p>
              <p className="text-sm text-muted-foreground">
                Créez un client pro pour lui ouvrir un espace.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {entreprises.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{e.raisonSociale}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.contactNom ? `${e.contactNom} · ` : ""}
                      {e._count.inscriptions} salarié(s) en formation
                    </p>
                  </div>
                  {e.portalToken ? (
                    <div className="flex w-full items-center gap-2 sm:w-auto">
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Actif</Badge>
                      <div className="w-72 max-w-full">
                        <CopyAcceptLink path={`/portail/${e.portalToken}`} />
                      </div>
                      <form action={revokePortalLink}>
                        <input type="hidden" name="entrepriseId" value={e.id} />
                        <Button type="submit" variant="ghost" size="sm">Désactiver</Button>
                      </form>
                    </div>
                  ) : (
                    <form action={generatePortalLink}>
                      <input type="hidden" name="entrepriseId" value={e.id} />
                      <Button type="submit" size="sm" variant="outline">
                        <Link2 className="mr-1.5 h-4 w-4" /> Activer l&apos;espace
                      </Button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
