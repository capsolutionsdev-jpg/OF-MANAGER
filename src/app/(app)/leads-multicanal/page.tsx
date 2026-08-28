import Link from "next/link";
import { Inbox } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ManualLeadForm } from "@/components/leads/manual-lead-form";
import { LeadsTable, type LeadRow } from "@/components/leads/leads-table";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const db = await getTenantDb();
  // Server Component : évalué à chaque requête serveur. Date.now() impur → toléré.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const since30 = new Date(now - 30 * 24 * 3600 * 1000);
  const since90 = new Date(now - 90 * 24 * 3600 * 1000);

  const [recents, channelGroups, count30, count90] = await Promise.all([
    db.candidat.findMany({
      where: { createdAt: { gte: since90 } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        prenom: true,
        nom: true,
        email: true,
        sourceConnaissance: true,
        createdAt: true,
      },
    }),
    db.candidat.groupBy({ by: ["sourceConnaissance"], _count: { _all: true } }),
    db.candidat.count({ where: { createdAt: { gte: since30 } } }),
    db.candidat.count({ where: { createdAt: { gte: since90 } } }),
  ]);

  // Répartition par canal d'acquisition
  // Audit 07 (A07-012) : répartition calculée en base (groupBy) au lieu de charger
  // toute la table candidats ; on re-fusionne les libellés sur le petit jeu agrégé.
  const channels = new Map<string, number>();
  let totalProspects = 0;
  for (const g of channelGroups) {
    const n = g._count._all;
    totalProspects += n;
    const k = g.sourceConnaissance?.trim() || "Non renseigné";
    channels.set(k, (channels.get(k) ?? 0) + n);
  }
  const channelList = [...channels.entries()].sort((a, b) => b[1] - a[1]);
  const maxChannel = Math.max(1, ...channelList.map(([, n]) => n));
  const topCanal = channelList[0];

  const rows: LeadRow[] = recents.map((c) => ({
    id: c.id,
    prenom: c.prenom,
    nom: c.nom,
    email: c.email ?? "",
    canal: c.sourceConnaissance?.trim() || "Non renseigné",
    date: c.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Capture de leads multi-canal"
        subtitle="Centralisez tous vos prospects : formulaire web, EDOF (CPF), Kairos (France Travail), téléphone…"
      >
        <ManualLeadForm />
      </PageHeader>

      {/* KPI courts */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Leads (30 j)" value={count30} />
        <Kpi label="Leads (90 j)" value={count90} />
        <Kpi label="Total prospects" value={totalProspects} />
        <Kpi
          label="Canal principal"
          value={topCanal ? topCanal[0] : "—"}
          hint={topCanal ? `${topCanal[1]} leads` : undefined}
          small
        />
      </div>

      {/* Leads récents — table filtrable par canal */}
      <Card>
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            <Inbox className="h-4 w-4" /> Leads récents (90 j)
          </span>
          <Button variant="ghost" size="sm" render={<Link href="/crm" />}>
            Voir dans le CRM →
          </Button>
        </div>
        <CardContent className="p-4">
          <LeadsTable rows={rows} />
        </CardContent>
      </Card>

      {/* Secondaire : répartition + doc API, repliés */}
      <div className="grid gap-4 md:grid-cols-2">
        <details className="rounded-lg border bg-card">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
            Répartition par canal
          </summary>
          <div className="space-y-2 border-t p-4">
            {channelList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun lead pour le moment.</p>
            ) : (
              channelList.map(([src, n]) => (
                <div key={src} className="flex items-center gap-3 text-sm">
                  <span className="w-40 shrink-0 truncate">{src}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(n / maxChannel) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-muted-foreground">{n}</span>
                </div>
              ))
            )}
          </div>
        </details>

        <details className="rounded-lg border bg-card">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
            Connecter mon site (formulaire web / API)
          </summary>
          <div className="space-y-2 border-t p-4 text-sm">
            <p className="text-muted-foreground">
              Envoyez les prospects en
              <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">POST</code>
              vers l&apos;endpoint ci-dessous. Le lead arrive directement dans le CRM.
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
              Les portails EDOF (CPF) et Kairos (France Travail) n&apos;exposent pas d&apos;API
              ouverte : utilisez « Saisir un lead » pour les importer en un clic.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  small,
}: {
  label: string;
  value: string | number;
  hint?: string;
  small?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={small ? "truncate text-lg font-bold" : "text-2xl font-bold"}>{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
