import { Banknote, TrendingDown, Scale } from "lucide-react";
import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { ExportMenu } from "@/components/export-menu";
import { ChargesManager, type ChargeRow } from "@/components/finance/charges-manager";
import { FinanceRecap, type RecapRow } from "@/components/finance/finance-recap";

export const dynamic = "force-dynamic";

const euro = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " €";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export default async function TresoreriePage() {
  await requireSection("comptabilite");
  const db = await getTenantDb();

  const [factures, civic, depenses] = await Promise.all([
    db.facture.findMany({
      where: { statut: { in: ["ENVOYEE", "PAYEE", "PARTIELLE"] } },
      select: { montantTTC: true, dateEmission: true },
    }),
    db.civicPaiement.findMany({
      where: { statut: "paye" },
      select: { montantCents: true, date: true },
    }),
    db.depenseCentre.findMany({
      orderBy: { date: "desc" },
      select: {
        id: true, date: true, categorie: true, categorieAutre: true, libelle: true,
        montantCents: true, numeroPiece: true, statut: true,
      },
    }),
  ]);

  // ── CA par mois (cents) : factures TTC + paiements civiques ──
  const caByMonth = new Map<string, number>();
  for (const f of factures) {
    const cents = Math.round(Number(f.montantTTC) * 100);
    const k = monthKey(f.dateEmission);
    caByMonth.set(k, (caByMonth.get(k) ?? 0) + cents);
  }
  for (const p of civic) {
    const k = monthKey(p.date);
    caByMonth.set(k, (caByMonth.get(k) ?? 0) + p.montantCents);
  }

  // ── Charges par mois (cents) ──
  const chargesByMonth = new Map<string, number>();
  for (const d of depenses) {
    const k = monthKey(d.date);
    chargesByMonth.set(k, (chargesByMonth.get(k) ?? 0) + d.montantCents);
  }

  const chargeRows: ChargeRow[] = depenses.map((d) => ({
    id: d.id,
    date: d.date.toISOString(),
    categorie: d.categorie,
    categorieAutre: d.categorieAutre,
    libelle: d.libelle,
    montantCents: d.montantCents,
    numeroPiece: d.numeroPiece,
    statut: d.statut,
  }));

  // ── Mois présents (union), triés du plus récent au plus ancien ──
  const allMonths = [...new Set([...caByMonth.keys(), ...chargesByMonth.keys()])].sort().reverse();
  const monthOptions = allMonths.map((m) => ({ value: m, label: monthLabel(m) }));

  const recap: RecapRow[] = allMonths.map((m) => {
    const ca = caByMonth.get(m) ?? 0;
    const ch = chargesByMonth.get(m) ?? 0;
    return { mois: m, label: monthLabel(m), caCents: ca, chargesCents: ch, balanceCents: ca - ch };
  });

  // ── Totaux (12 derniers mois glissants pour les KPIs) ──
  const totalCa = [...caByMonth.values()].reduce((a, b) => a + b, 0);
  const totalCharges = [...chargesByMonth.values()].reduce((a, b) => a + b, 0);
  const balance = totalCa - totalCharges;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trésorerie & bilan"
        subtitle="Suivi financier du centre : chiffre d'affaires, charges et balance mensuelle (toutes formations)."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Kpi icon={Banknote} label="CA total (facturé)" value={euro(totalCa)} tone="pos" />
        <Kpi icon={TrendingDown} label="Charges totales" value={euro(totalCharges)} tone="neg" />
        <Kpi icon={Scale} label="Balance" value={euro(balance)} tone={balance >= 0 ? "pos" : "neg"} />
      </div>

      <Tabs defaultValue="recap" className="space-y-6">
        <TabsList>
          <TabsTrigger value="recap">Récap &amp; bilan</TabsTrigger>
          <TabsTrigger value="ca">CA — entrées d&apos;argent</TabsTrigger>
          <TabsTrigger value="charges">Charges</TabsTrigger>
        </TabsList>

        <TabsContent value="recap">
          <FinanceRecap rows={recap} />
        </TabsContent>

        <TabsContent value="ca" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Entrées d&apos;argent = factures émises (toutes formations) + paiements de la préparation
              civique. Détail des factures dans « Suivi comptable ».
            </p>
            <ExportMenu href="/tresorerie/export/ca" label="Exporter" size="sm" />
          </div>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="p-3 font-medium">Mois</th>
                  <th className="p-3 text-right font-medium">CA facturé</th>
                </tr>
              </thead>
              <tbody>
                {recap.filter((r) => r.caCents > 0).length === 0 ? (
                  <tr><td colSpan={2} className="p-6 text-center text-muted-foreground">Aucune entrée pour le moment.</td></tr>
                ) : (
                  recap.filter((r) => r.caCents > 0).map((r) => (
                    <tr key={r.mois} className="border-b last:border-0">
                      <td className="p-3 capitalize">{r.label}</td>
                      <td className="p-3 text-right font-medium text-emerald-700">{euro(r.caCents)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="charges">
          <ChargesManager charges={chargeRows} months={monthOptions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "pos" | "neg";
}) {
  return (
    <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="pt-5">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <p className={`mt-2 text-2xl font-bold ${tone === "pos" ? "text-emerald-700" : "text-rose-700"}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
