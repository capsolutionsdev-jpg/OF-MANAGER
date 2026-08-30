import { BarChart3, TrendingUp, Euro, FileText, Users } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { ExportMenu } from "@/components/export-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { CRM_STAGE_ORDER, CRM_STAGE_LABELS } from "@/lib/validators/crm";
import type { CrmStage } from "@prisma/client";

export const dynamic = "force-dynamic";

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";

// Probabilité de conversion pondérée par étape (CA prévisionnel).
const STAGE_PROBA: Record<CrmStage, number> = {
  NOUVEAU: 0.1,
  QUALIFIE: 0.3,
  PROPOSITION: 0.5,
  NEGOCIATION: 0.75,
  GAGNE: 1,
  PERDU: 0,
};

function Bar({ label, value, max, sub }: { label: string; value: number; max: number; sub?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-32 shrink-0 truncate">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
      <span className="w-24 shrink-0 text-right text-muted-foreground">{sub ?? value}</span>
    </div>
  );
}

function Kpi({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: typeof BarChart3 }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default async function RapportsPage() {
  const db = await getTenantDb();

  const [stageGroups, sourceGroups, devis, factures, sessions, paiementsSum] = await Promise.all([
    // Audit 07 (A07-012) : agrégations en base (groupBy) au lieu de charger toute la
    // table candidats pour compter/sommer en mémoire.
    db.candidat.groupBy({
      by: ["crmStage"],
      where: { statut: { not: "ARCHIVE" } },
      _count: { _all: true },
      _sum: { valeurEstimee: true },
    }),
    db.candidat.groupBy({
      by: ["sourceConnaissance"],
      where: { statut: { not: "ARCHIVE" } },
      _count: { _all: true },
    }),
    // acceptedAt : un devis signé en ligne garde statut=ENVOYEE (le « payé » est
    // réservé au cycle facture) → c'est acceptedAt qui fait foi pour l'acceptation.
    db.devis.findMany({ select: { acceptedAt: true } }),
    // Factures non soldées : reste dû = TTC − règlements réels de la facture.
    db.facture.findMany({
      where: { statut: { in: ["ENVOYEE", "PARTIELLE"] } },
      select: { montantTTC: true, paiements: { select: { montant: true } } },
    }),
    // Remplissage : sessions actives uniquement (ni archivées ni annulées) et on
    // ne compte QUE les inscriptions non annulées.
    db.session.findMany({
      where: { isArchived: false, statut: { not: "ANNULEE" } },
      select: {
        nbPlaces: true,
        _count: { select: { inscriptions: { where: { statut: { not: "ANNULEE" } } } } },
      },
    }),
    // Encaissé réel = somme de TOUS les règlements (liés facture OU inscription).
    db.paiement.aggregate({ _sum: { montant: true } }),
  ]);

  // ── Funnel pipeline ──
  const stageCounts = new Map<CrmStage, number>();
  for (const s of CRM_STAGE_ORDER) stageCounts.set(s, 0);
  for (const g of stageGroups) stageCounts.set(g.crmStage, g._count._all);
  const maxStage = Math.max(1, ...[...stageCounts.values()]);

  const total = stageGroups.reduce((a, g) => a + g._count._all, 0);
  const gagnes = stageCounts.get("GAGNE") ?? 0;
  const perdus = stageCounts.get("PERDU") ?? 0;
  const decides = gagnes + perdus;
  const tauxConversion = decides > 0 ? Math.round((gagnes / decides) * 100) : 0;

  // ── CA prévisionnel pondéré (opportunités ouvertes) ──
  const caPondere = stageGroups
    .filter((g) => g.crmStage !== "GAGNE" && g.crmStage !== "PERDU")
    .reduce((a, g) => a + Number(g._sum.valeurEstimee ?? 0) * STAGE_PROBA[g.crmStage], 0);
  const caGagne = Number(stageGroups.find((g) => g.crmStage === "GAGNE")?._sum.valeurEstimee ?? 0);

  // ── Sources d'acquisition ──
  const sourceCounts = new Map<string, number>();
  for (const g of sourceGroups) {
    const k = g.sourceConnaissance?.trim() || "Non renseigné";
    sourceCounts.set(k, (sourceCounts.get(k) ?? 0) + g._count._all);
  }
  const sources = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxSource = Math.max(1, ...sources.map(([, n]) => n));

  // ── Devis ──
  const devisTotal = devis.length;
  const devisAcceptes = devis.filter((d) => d.acceptedAt != null).length;
  const tauxDevis = devisTotal > 0 ? Math.round((devisAcceptes / devisTotal) * 100) : 0;

  // ── Revenus (factures) ──
  // Encaissé = somme réelle des règlements. En attente = reste dû sur les factures
  // non soldées (TTC − règlements de la facture, jamais négatif).
  const encaisse = Number(paiementsSum._sum.montant ?? 0);
  const enAttente = factures.reduce((a, f) => {
    const paye = f.paiements.reduce((s, p) => s + Number(p.montant), 0);
    return a + Math.max(0, Number(f.montantTTC) - paye);
  }, 0);

  // ── Remplissage des sessions ──
  const totalPlaces = sessions.reduce((a, s) => a + (s.nbPlaces ?? 0), 0);
  const totalInscrits = sessions.reduce((a, s) => a + s._count.inscriptions, 0);
  const remplissage = totalPlaces > 0 ? Math.round((totalInscrits / totalPlaces) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapports analytiques"
        subtitle="Vue consolidée : conversion, prévisionnel, acquisition et revenus."
      >
        <div className="flex flex-wrap gap-2">
          <ExportMenu href="/candidats/export" label="Candidats" />
          <ExportMenu href="/sessions/export" label="Sessions" />
          <ExportMenu href="/comptabilite/export" label="Factures" />
          <ExportMenu href="/rapports/pedagogique" label="Pédagogique" />
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Taux de conversion" value={`${tauxConversion}%`} sub={`${gagnes} gagné(s) / ${perdus} perdu(s)`} icon={TrendingUp} />
        <Kpi label="CA prévisionnel" value={euro(caPondere)} sub="pondéré par étape" icon={Euro} />
        <Kpi label="CA gagné" value={euro(caGagne)} sub="opportunités gagnées" icon={Euro} />
        <Kpi label="Remplissage sessions" value={`${remplissage}%`} sub={`${totalInscrits} / ${totalPlaces} places`} icon={Users} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" /> Entonnoir de conversion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {CRM_STAGE_ORDER.map((s) => (
              <Bar key={s} label={CRM_STAGE_LABELS[s]} value={stageCounts.get(s) ?? 0} max={maxStage} />
            ))}
            <p className="pt-1 text-xs text-muted-foreground">{total} opportunité(s) active(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> Sources d&apos;acquisition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée.</p>
            ) : (
              sources.map(([src, n]) => (
                <Bar key={src} label={src} value={n} max={maxSource} sub={`${n} (${Math.round((n / total) * 100)}%)`} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Devis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Devis émis</span><span className="font-medium">{devisTotal}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Acceptés</span><span className="font-medium">{devisAcceptes}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Taux d&apos;acceptation</span><span className="font-medium">{tauxDevis}%</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Euro className="h-4 w-4" /> Revenus (factures)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Encaissé</span><span className="font-medium text-success">{euro(encaisse)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">En attente</span><span className="font-medium text-warning">{euro(enAttente)}</span></div>
            <div className="flex justify-between border-t pt-1.5"><span className="text-muted-foreground">Total facturé</span><span className="font-bold">{euro(encaisse + enAttente)}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
