import { auth } from "@/auth";
import { exportRateLimited } from "@/lib/security/export-guard";
import { getTenantDb } from "@/lib/tenant";
import { exportResponse } from "@/lib/export";
import { buildSheet } from "@/lib/export-xlsx";
import { hasExamenCivique } from "@/lib/civique-guard";
import type { CivicMention, CivicPaiementMethode } from "@prisma/client";

export const runtime = "nodejs";

const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION"];

const MENTION_LABEL: Record<CivicMention, string> = {
  CSP: "Carte de séjour (CSP)",
  CR: "Carte de résident (CR)",
  NATURALISATION: "Naturalisation",
};
const METHODE_LABEL: Record<CivicPaiementMethode, string> = {
  STRIPE: "CB en ligne",
  CB_TPE: "CB (TPE)",
  ESPECES: "Espèces",
  CHEQUE: "Chèque",
  VIREMENT: "Virement",
};
const STATUT_LABEL: Record<string, string> = {
  paye: "Payé",
  rembourse: "Remboursé",
  annule: "Annulé",
  en_attente: "En attente",
};

const eur = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const fdate = (d: Date) => d.toLocaleDateString("fr-FR");

// Export comptable des factures civiques (CSV / Excel / PDF).
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }
  const limited = exportRateLimited(session.user.id);
  if (limited) return limited;
  if (session.user.role !== "SUPERADMIN" && !(await hasExamenCivique())) {
    return new Response("Module non activé pour cet organisme", { status: 403 });
  }
  const db = await getTenantDb();
  const factures = await db.civicFacture.findMany({
    orderBy: { date: "desc" },
    include: { paiement: { select: { statut: true } } },
  });

  const sheet = buildSheet("Factures civiques", factures, [
    { header: "Type", value: (f) => (f.type === "AVOIR" ? "Avoir" : "Facture") },
    { header: "N° pièce", value: (f) => f.numero },
    { header: "Date", value: (f) => fdate(f.date) },
    { header: "Client", value: (f) => f.clientNom },
    { header: "E-mail", value: (f) => f.clientEmail ?? "" },
    { header: "Formation", value: (f) => MENTION_LABEL[f.mention] },
    { header: "Montant HT (€)", value: (f) => eur(f.montantHtCents) },
    { header: "TVA", value: (f) => (f.exonereTva ? "Exonérée" : eur(f.tvaCents)) },
    { header: "Montant TTC (€)", value: (f) => eur(f.montantTtcCents) },
    { header: "Mode de règlement", value: (f) => METHODE_LABEL[f.methode] },
    { header: "Statut", value: (f) => STATUT_LABEL[f.paiement?.statut ?? ""] ?? "—" },
  ]);

  return exportResponse({
    req,
    basename: "comptabilite-civique",
    title: "Export comptable — Préparation examen civique",
    sheets: [sheet],
  });
}
