import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { toCsv, csvResponse, dateStamp } from "@/lib/export-csv";

export const runtime = "nodejs";

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION"];
const fdate = (d: Date | null | undefined) => (d ? d.toLocaleDateString("fr-FR") : "");
const eur = (d: { toString(): string }) => Number(d).toFixed(2).replace(".", ",");

// Export CSV des factures de l'organisme (compta / Excel FR).
export async function GET() {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }
  const db = await getTenantDb();
  const rows = await db.facture.findMany({
    orderBy: { dateEmission: "desc" },
    include: { entreprise: { select: { raisonSociale: true } } },
  });

  const csv = toCsv(rows, [
    { header: "Référence", value: (r) => r.reference },
    { header: "Client", value: (r) => r.entreprise?.raisonSociale ?? "Particulier" },
    { header: "Émise le", value: (r) => fdate(r.dateEmission) },
    { header: "Montant HT", value: (r) => eur(r.montantHT) },
    { header: "TVA %", value: (r) => eur(r.tva) },
    { header: "Montant TTC", value: (r) => eur(r.montantTTC) },
    { header: "Statut", value: (r) => r.statut },
    { header: "Payée le", value: (r) => fdate(r.datePaiement) },
  ]);

  return csvResponse(`factures-${dateStamp()}.csv`, csv);
}
