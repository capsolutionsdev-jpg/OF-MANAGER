import { Lightbulb } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { getCoutsOverview } from "@/lib/console-couts";
import { OPTIMISATIONS } from "@/lib/couts";
import { euros } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", tone)}>{value}</p>
    </div>
  );
}

export default async function CoutsPage() {
  await requireSuperAdmin();
  const { rows, totalRevenu, totalCout, totalMarge, margePct } = await getCoutsOverview();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Coûts & marge"
        subtitle="Coût de revient estimé par client (Vercel / Neon / Resend) et marge brute."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Revenu récurrent / mois" value={euros(totalRevenu)} />
        <Stat label="Coût estimé / mois" value={euros(totalCout)} />
        <Stat label="Marge brute / mois" value={euros(totalMarge)} tone="text-emerald-600" />
        <Stat label="Marge %" value={`${margePct}%`} tone="text-emerald-600" />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Aucun client (hors démo) pour l'instant.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Client</th>
                <th className="px-4 py-2.5 text-right font-medium">E-mails</th>
                <th className="px-4 py-2.5 text-right font-medium">Inscr.</th>
                <th className="px-4 py-2.5 text-right font-medium">SMS</th>
                <th className="px-4 py-2.5 text-right font-medium">Coût</th>
                <th className="px-4 py-2.5 text-right font-medium">Revenu</th>
                <th className="px-4 py-2.5 text-right font-medium">Marge</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2.5 font-medium">{r.nom}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{r.usage.emails}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{r.usage.inscriptions}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{r.usage.sms}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{euros(r.cout)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{euros(r.revenu)}</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums text-emerald-600">
                    {euros(r.margeEur)} <span className="text-xs text-muted-foreground">({r.margePct}%)</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl border p-4">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
          <Lightbulb className="h-4 w-4 text-amber-500" /> Optimisations prioritaires
        </p>
        <ul className="space-y-2.5">
          {OPTIMISATIONS.map((o) => (
            <li key={o.titre} className="text-sm">
              <span className="font-medium">{o.titre}</span>
              <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700">{o.gain}</span>
              <p className="text-xs text-muted-foreground">{o.detail}</p>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        Estimations : e-mails / inscriptions (→ PDF) / SMS comptés du mois × tarifs fournisseurs. Le compute Neon (CU-heure)
        n'est pas attribuable par client → une part d'infra forfaitaire est amortie. OVH est hors architecture.
      </p>
    </div>
  );
}
