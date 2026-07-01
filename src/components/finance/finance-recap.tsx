import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportMenu } from "@/components/export-menu";

export type RecapRow = {
  mois: string; // "AAAA-MM"
  label: string;
  caCents: number;
  chargesCents: number;
  balanceCents: number;
};

const euro = (c: number) =>
  (c / 100).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " €";
const shortMonth = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "short" }) + " " + String(y).slice(2);
};

export function FinanceRecap({ rows }: { rows: RecapRow[] }) {
  // Graphique : 12 derniers mois, en ordre chronologique.
  const chrono = [...rows].reverse().slice(-12);
  const max = Math.max(1, ...chrono.map((r) => Math.max(r.caCents, r.chargesCents)));

  // Cumul annuel.
  const byYear = new Map<string, { ca: number; charges: number }>();
  for (const r of rows) {
    const y = r.mois.slice(0, 4);
    const e = byYear.get(y) ?? { ca: 0, charges: 0 };
    e.ca += r.caCents;
    e.charges += r.chargesCents;
    byYear.set(y, e);
  }
  const annees = [...byYear.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  // Dimensions SVG.
  const groupW = 46;
  const barW = 16;
  const chartH = 170;
  const padTop = 12;
  const padBottom = 26;
  const width = Math.max(320, chrono.length * groupW + 40);
  const h = (cents: number) => Math.round((cents / max) * chartH);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Balance mensuelle (CA vs charges)</CardTitle>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" /> CA</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-500" /> Charges</span>
            <ExportMenu href="/tresorerie/export/recap" label="Exporter" size="sm" />
          </div>
        </CardHeader>
        <CardContent>
          {chrono.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune donnée. Ajoutez des dépenses et enregistrez des paiements pour voir le bilan.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${width} ${chartH + padTop + padBottom}`} width="100%" style={{ maxWidth: width, minWidth: 320 }} role="img"
                aria-label="Graphique en barres du chiffre d'affaires et des charges par mois">
                <style>{`
                  .fin-bar{transform-box:fill-box;transform-origin:bottom;animation:finGrow .6s cubic-bezier(.2,.8,.2,1) both;transition:opacity .15s}
                  .fin-group:hover .fin-bar{opacity:.8}
                  .fin-group{cursor:default}
                  @keyframes finGrow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
                `}</style>
                <line x1="0" y1={chartH + padTop} x2={width} y2={chartH + padTop} stroke="#e5e7eb" />
                {chrono.map((r, i) => {
                  const gx = 20 + i * groupW;
                  const caH = h(r.caCents);
                  const chH = h(r.chargesCents);
                  const bal = r.caCents - r.chargesCents;
                  return (
                    <g key={r.mois} className="fin-group">
                      <title>{`${r.label} — CA ${euro(r.caCents)} · Charges ${euro(r.chargesCents)} · Balance ${euro(bal)}`}</title>
                      <rect x={gx} y={padTop + chartH - caH} width={barW / 2 + 2} height={caH} rx="2" fill="#10b981"
                        className="fin-bar" style={{ animationDelay: `${i * 45}ms` }} />
                      <rect x={gx + barW / 2 + 3} y={padTop + chartH - chH} width={barW / 2 + 2} height={chH} rx="2" fill="#f43f5e"
                        className="fin-bar" style={{ animationDelay: `${i * 45 + 60}ms` }} />
                      <text x={gx + barW / 2} y={chartH + padTop + 16} textAnchor="middle" fontSize="10" fill="#6b7280">
                        {shortMonth(r.mois)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détail mensuel</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="p-3 font-medium">Mois</th>
                <th className="p-3 text-right font-medium">CA</th>
                <th className="p-3 text-right font-medium">Charges</th>
                <th className="p-3 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Aucune donnée.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.mois} className="border-b last:border-0 transition-colors hover:bg-muted/40">
                    <td className="p-3 capitalize">{r.label}</td>
                    <td className="p-3 text-right text-emerald-700">{euro(r.caCents)}</td>
                    <td className="p-3 text-right text-rose-700">{euro(r.chargesCents)}</td>
                    <td className={`p-3 text-right font-semibold ${r.balanceCents >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {euro(r.balanceCents)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {annees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cumul annuel</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="p-3 font-medium">Année</th>
                  <th className="p-3 text-right font-medium">CA</th>
                  <th className="p-3 text-right font-medium">Charges</th>
                  <th className="p-3 text-right font-medium">Résultat</th>
                </tr>
              </thead>
              <tbody>
                {annees.map(([y, e]) => (
                  <tr key={y} className="border-b last:border-0 transition-colors hover:bg-muted/40">
                    <td className="p-3 font-medium">{y}</td>
                    <td className="p-3 text-right text-emerald-700">{euro(e.ca)}</td>
                    <td className="p-3 text-right text-rose-700">{euro(e.charges)}</td>
                    <td className={`p-3 text-right font-semibold ${e.ca - e.charges >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {euro(e.ca - e.charges)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
