import Link from "next/link";
import { Inbox, Globe, Radio } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ManualLeadForm } from "@/components/leads/manual-lead-form";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const db = await getTenantDb();
  // Server Component : évalué à chaque requête serveur (pas de re-render React).
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 90 * 24 * 3600 * 1000);

  const [recents, all] = await Promise.all([
    db.candidat.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        prenom: true,
        nom: true,
        email: true,
        statut: true,
        sourceConnaissance: true,
        createdAt: true,
      },
    }),
    db.candidat.findMany({ select: { sourceConnaissance: true } }),
  ]);

  // Répartition par canal d'acquisition
  const channels = new Map<string, number>();
  for (const c of all) {
    const k = c.sourceConnaissance?.trim() || "Non renseigné";
    channels.set(k, (channels.get(k) ?? 0) + 1);
  }
  const channelList = [...channels.entries()].sort((a, b) => b[1] - a[1]);
  const maxChannel = Math.max(1, ...channelList.map(([, n]) => n));
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Capture de leads multi-canal"
        subtitle="Centralisez tous vos prospects : formulaire web, EDOF (CPF), Kairos (France Travail), téléphone…"
      >
        <ManualLeadForm />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="h-4 w-4" /> Répartition par canal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {channelList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun lead pour le moment.</p>
            ) : (
              channelList.map(([src, n]) => (
                <div key={src} className="flex items-center gap-3 text-sm">
                  <span className="w-40 shrink-0 truncate">{src}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(n / maxChannel) * 100}%` }} />
                  </div>
                  <span className="w-10 shrink-0 text-right text-muted-foreground">{n}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" /> Formulaire web (API)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              Connectez le formulaire de votre site : il suffit d&apos;envoyer les prospects en
              <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">POST</code> vers l&apos;endpoint ci-dessous. Le lead arrive directement dans le CRM.
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">
{`POST /api/lead
Content-Type: application/json
x-lead-secret: <votre secret>

{
  "prenom": "…", "nom": "…",
  "email": "…", "telephone": "…",
  "formation": "…", "financement": "CPF",
  "source": "site"
}`}
            </pre>
            <p className="text-xs text-muted-foreground">
              Les portails EDOF (CPF) et Kairos (France Travail) n&apos;exposent pas d&apos;API ouverte :
              utilisez « Saisir un lead » pour les y importer en un clic.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="h-4 w-4" /> Leads récents (90 j)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recents.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Aucun lead sur les 90 derniers jours.
            </div>
          ) : (
            <div className="divide-y">
              {recents.map((c) => (
                <Link
                  key={c.id}
                  href={`/candidats/${c.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.prenom} {c.nom}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {c.sourceConnaissance?.trim() || "Non renseigné"}
                    </Badge>
                    <span className="hidden text-xs text-muted-foreground sm:inline">{fmt(c.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
