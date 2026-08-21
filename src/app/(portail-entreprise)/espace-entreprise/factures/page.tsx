import { Receipt, FileDown } from "lucide-react";
import { requireEntreprise } from "@/lib/entreprise-portal";
import { getEntrepriseFactures } from "@/lib/entreprise-data";
import { RubriqueHeader, EmptyState, Badge, fmtDate, fmtEuro } from "@/components/entreprise/portal-ui";

export const dynamic = "force-dynamic";

const STATUT_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  BROUILLON: "neutral",
  ENVOYEE: "info",
  PAYEE: "success",
  PARTIELLE: "warning",
  ANNULEE: "neutral",
  AVOIR: "neutral",
};
const STATUT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYEE: "Envoyée",
  PAYEE: "Payée",
  PARTIELLE: "Partielle",
  ANNULEE: "Annulée",
  AVOIR: "Avoir",
};

export default async function FacturesPage() {
  const entreprise = await requireEntreprise();
  const factures = await getEntrepriseFactures(entreprise.id);

  return (
    <div>
      <RubriqueHeader title="Factures" subtitle="Vos factures émises par votre organisme de formation." />
      {factures.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-8 w-8" />}
          title="Aucune facture"
          hint="Vos factures seront déposées ici par votre organisme et téléchargeables en un clic."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Référence</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Montant TTC</th>
                <th className="px-4 py-2 font-medium">Statut</th>
                <th className="px-4 py-2 font-medium text-right">Document</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {factures.map((f) => (
                <tr key={f.id}>
                  <td className="whitespace-nowrap px-4 py-2.5 font-medium">{f.reference}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{fmtDate(f.dateEmission)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">{fmtEuro(f.montantTTC)}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={STATUT_TONE[f.statut] ?? "neutral"}>{STATUT_LABEL[f.statut] ?? f.statut}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {f.fileUrl ? (
                      <a
                        href={`/espace-entreprise/download?kind=facture&id=${f.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                      >
                        <FileDown className="h-4 w-4" />
                        Télécharger
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
