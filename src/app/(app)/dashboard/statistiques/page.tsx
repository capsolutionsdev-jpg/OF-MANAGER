import Link from "next/link";
import { PieChart, Megaphone, Clock, ArrowLeft, ArrowRight } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { INSCRIPTION_STATUT_LABELS } from "@/lib/validators/inscription";
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";

export const metadata = { title: "Statistiques" };

/** Barre horizontale de répartition (libellé, valeur, part relative). */
function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`bar-anim h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function StatistiquesPage() {
  const db = await getTenantDb();

  const [parStatut, parFinancement, parSource] = await Promise.all([
    db.inscription.groupBy({ by: ["statut"], _count: { _all: true } }),
    db.inscription.groupBy({ by: ["financementType"], _count: { _all: true } }),
    db.candidat.groupBy({ by: ["sourceConnaissance"], _count: { _all: true } }),
  ]);

  const finMax = Math.max(1, ...parFinancement.map((s) => s._count._all));
  const sourceMax = Math.max(1, ...parSource.map((s) => s._count._all));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistiques"
        subtitle="Répartition des inscriptions (statut, financement) et provenance des prospects."
      >
        <Button variant="outline" render={<Link href="/dashboard" />}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tableau de bord
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-4 w-4" /> Inscriptions par statut
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {parStatut.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune inscription.</p>
            ) : (
              parStatut.map((s) =>
                s.statut === "EN_ATTENTE" ? (
                  <Link
                    key={s.statut}
                    href="/crm"
                    className="flex items-center justify-between rounded-lg bg-warning/10 px-3 py-2 text-sm transition-colors hover:bg-warning/20"
                  >
                    <span className="flex items-center gap-1.5 font-medium text-warning">
                      <Clock className="h-3.5 w-3.5" /> En attente
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-warning">
                      {s._count._all} · à relancer <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                ) : (
                  <div key={s.statut} className="flex items-center justify-between px-3 py-1.5 text-sm">
                    <span className="text-muted-foreground">{INSCRIPTION_STATUT_LABELS[s.statut]}</span>
                    <span className="font-semibold">{s._count._all}</span>
                  </div>
                ),
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Inscriptions par financement</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {parFinancement.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune inscription.</p>
            ) : (
              parFinancement.map((s) => (
                <Bar
                  key={s.financementType ?? "none"}
                  label={s.financementType ? FINANCEMENT_LABELS[s.financementType] : "Non précisé"}
                  value={s._count._all}
                  max={finMax}
                  color="bg-success"
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4" /> Provenance des prospects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {parSource.filter((s) => s.sourceConnaissance).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune source renseignée.</p>
            ) : (
              parSource
                .filter((s) => s.sourceConnaissance)
                .sort((a, b) => b._count._all - a._count._all)
                .map((s) => (
                  <Bar
                    key={s.sourceConnaissance}
                    label={s.sourceConnaissance!}
                    value={s._count._all}
                    max={sourceMax}
                    color="bg-info"
                  />
                ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
