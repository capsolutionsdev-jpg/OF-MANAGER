import { BarChart3, TrendingUp, Euro, FileText, Users } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
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

  const [candidats, devis, factures, sessions] = await Promise.all([
    db.candidat.findMany({
      where: { statut: { not: "ARCHIVE" } },
      select: { crmStage: true, valeurEstimee: true, statut: true, sourceConnaissance: true, createdAt: true },
    }),
    db.devis.findMany({ select: { statut: true, montantTTC: true } }),
    db.facture.findMany({ select: { statut: true, montantTTC: true } }),
    db.session.findMany({
      select: { nbPlaces: true, _count: { select: { inscriptions: true } } },
    }),
  ]);

  // ── Funnel pipeline ──
  const stageCounts = new Map<CrmStage, number>();
  for (const s of CRM_STAGE_ORDER) stageCounts.set(s, 0);
  for (const c of candidats) stageCounts.set(c.crmStage, (stageCounts.get(c.crmStage) ?? 0) + 1);
  const maxStage = Math.max(1, ...[...stageCounts.values()]);

  const total = candidats.length;
  const gagnes = stageCounts.get("GAGNE") ?? 0;
  const perdus = stageCounts.get("PERDU") ?? 0;
  const decides = gagnes + perdus;
  const tauxConversion = decides > 0 ? Math.round((gagnes / decides) * 100) : 0;

  // ── CA prévisionnel pondéré (opportunités ouvertes) ──
  const caPondere = candidats
    .filter((c) => c.crmStage !== "GAGNE" && c.crmStage !== "PERDU")
    .reduce((a, c) => a + (c.valeurEstimee ? Number(c.valeurEstimee) * STAGE_PROBA[c.crmStage] : 0), 0);
  const caGagne = candidats
    .filter((c) => c.crmStage === "GAGNE")
    .reduce((a, c) => a + (c.valeurEstimee ? Number(c.valeurEstimee) : 0), 0);

  // ── Sources d'acquisition ──
  const sourceCounts = new Map<string, number>();
  for (const c of candidats) {
    const k = c.sourceConnaissance?.trim() || "Non renseigné";
    sourceCounts.set(k, (sourceCounts.get(k) ?? 0) + 1);
  }
  const sources = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxSource = Math.max(1, ...sources.map(([, n]) => n));

  // ── Devis ──
  const devisTotal = devis.length;
  const devisAcceptes = devis.filter((d) => d.statut === "PAYEE").length;
  const tauxDevis = devisTotal > 0 ? Math.round((devisAcceptes / devisTotal) * 100) : 0;

  // ── Revenus (factures) ──
  const encaisse = factures.filter((f) => f.statut === "PAYEE").reduce((a, f) => a + Number(f.montantTTC), 0);
  const enAttente = factures
    .filter((f) => f.statut === "ENVOYEE" || f.statut === "PARTIELLE")
    .reduce((a, f) => a + Number(f.montantTTC), 0);

  // ── Remplissage des sessions ──
  const totalPlaces = sessions.reduce((a, s) => a + (s.nbPlaces ?? 0), 0);
  const totalInscrits = sessions.reduce((a, s) => a + s._count.inscriptions, 0);
  const remplissage = totalPlaces > 0 ? Math.round((totalInscrits / totalPlaces) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapports analytiques"
        subtitle="Vue consolidée : conversion, prévisionnel, acquisition et revenus."
      />

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
            <div className="flex justify-between"><span className="text-muted-foreground">Encaissé</span><span className="font-medium text-emerald-600">{euro(encaisse)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">En attente</span><span className="font-medium text-amber-600">{euro(enAttente)}</span></div>
            <div className="flex justify-between border-t pt-1.5"><span className="text-muted-foreground">Total facturé</span><span className="font-bold">{euro(encaisse + enAttente)}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
