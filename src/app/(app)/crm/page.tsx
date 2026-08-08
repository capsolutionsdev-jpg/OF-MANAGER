import Link from "next/link";
import { Plus, TrendingUp } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";
import { type SessionOption } from "@/components/inscriptions/quick-enroll-modal";
import { CrmTable, type CrmRow } from "@/components/crm/crm-table";

export const dynamic = "force-dynamic";
// QuickEnrollModal → createInscription → startParcours → PDF (Chromium).
export const runtime = "nodejs";
export const maxDuration = 60;

export default async function CrmPage() {
  const db = await getTenantDb();
  // Candidats non archivés avec leur formation souhaitée
  const candidats = await db.candidat.findMany({
    where: { statut: { not: "ARCHIVE" } },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    include: {
      formationSouhaitee: { select: { id: true, titre: true } },
      _count: { select: { inscriptions: true } },
    },
  });

  // Sessions ouvertes pour inscription rapide
  const sessions = await db.session.findMany({
    where: { statut: { in: ["PLANIFIEE", "OUVERTE", "EN_COURS"] } },
    include: { formation: { select: { id: true, titre: true } } },
    orderBy: { dateDebut: "asc" },
  });
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");
  const sessionOptions: SessionOption[] = sessions.map((s) => ({
    id: s.id,
    formationId: s.formationId,
    label: `${s.formation.titre} — ${fmt(s.dateDebut)} → ${fmt(s.dateFin)}${
      s.lieu ? ` (${s.lieu})` : ""
    }`,
  }));

  const total = candidats.length;
  const now = new Date();
  const gagnes = candidats.filter((c) => c.crmStage === "GAGNE").length;
  const inscrits = candidats.filter((c) => c.statut === "INSCRIT").length;
  const tauxConversion = total > 0 ? Math.round((gagnes / total) * 100) : 0;
  const relancesEnRetard = candidats.filter(
    (c) => c.relanceDate && c.relanceDate <= now && c.statut !== "INSCRIT",
  ).length;

  // Sources d'acquisition (repliées — recoupe le tableau de bord)
  const sourceCounts = new Map<string, number>();
  for (const c of candidats) {
    const key = c.sourceConnaissance?.trim() || "Non renseigné";
    sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
  }
  const sources = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]);
  const maxSource = sources.length ? sources[0][1] : 0;

  // Données de table sérialisables
  const rows: CrmRow[] = candidats.map((c) => ({
    id: c.id,
    prenom: c.prenom,
    nom: c.nom,
    email: c.email ?? "",
    telephone: c.telephone ?? "",
    ville: c.ville ?? "",
    financementLabel: c.financementType ? FINANCEMENT_LABELS[c.financementType] : null,
    statut: c.statut,
    formationTitre: c.formationSouhaitee?.titre ?? "Sans formation précisée",
    formationId: c.formationSouhaiteeId ?? null,
    inscriptionsCount: c._count.inscriptions,
    prospectSigned: !!c.prospectFormCompletedAt,
    prospectSent: !!c.prospectFormSentAt,
    enRetard: !!(c.relanceDate && c.relanceDate <= now && c.statut !== "INSCRIT"),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM — Prospects & inscriptions"
        subtitle={`${total} prospect${total !== 1 ? "s" : ""} actif${total !== 1 ? "s" : ""}`}
      >
        <Button variant="outline" render={<Link href="/crm/pipeline" />}>
          <TrendingUp className="mr-1.5 h-4 w-4" />
          Pipeline
        </Button>
        <Button render={<Link href="/candidats/nouveau" />}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nouveau prospect
        </Button>
      </PageHeader>

      {total > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi label="Prospects actifs" value={total} />
          <Kpi label="Taux de conversion" value={`${tauxConversion}%`} hint={`${gagnes} gagné(s)`} />
          <Kpi label="Inscrits" value={inscrits} />
          <Kpi label="Relances en retard" value={relancesEnRetard} danger={relancesEnRetard > 0} />
        </div>
      )}

      {total === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <p className="font-medium">Aucun prospect pour le moment</p>
            <p className="text-sm text-muted-foreground">
              Créez votre premier prospect pour commencer le suivi.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <CrmTable rows={rows} sessionOptions={sessionOptions} />

          {sources.length > 0 && (
            <details className="rounded-lg border bg-card">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                Sources d&apos;acquisition
              </summary>
              <div className="space-y-2 border-t p-4">
                {sources.map(([src, n]) => (
                  <div key={src} className="flex items-center gap-3 text-sm">
                    <span className="w-44 shrink-0 truncate">{src}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${maxSource ? (n / maxSource) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-muted-foreground">
                      {n} ({Math.round((n / total) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  danger,
}: {
  label: string;
  value: string | number;
  hint?: string;
  danger?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold${danger ? " text-red-600" : ""}`}>{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
