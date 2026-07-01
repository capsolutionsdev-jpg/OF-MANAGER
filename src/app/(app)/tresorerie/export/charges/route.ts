import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { exportResponse } from "@/lib/export";
import { buildSheet } from "@/lib/export-xlsx";
import type { DepenseCategorie } from "@prisma/client";

export const runtime = "nodejs";
const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION"];

const CAT_LABEL: Record<DepenseCategorie, string> = {
  LOYER: "Loyer", ELECTRICITE: "Électricité", TELEPHONIE: "Téléphonie", FORMATEUR: "Formateur",
  JURY_EXAMEN: "Jury d'examen", VISITE_SITE: "Visite de site", JURY_SSIAP: "Jury SSIAP",
  DIPLOME: "Diplôme", ADS: "Campagnes ADS", FOURNITURE_BUREAU: "Fourniture bureau",
  FRAIS_EXAMEN_VTC: "Frais examen VTC", FOURNITURE_ALIMENTAIRE: "Fourniture alimentaire",
  CARBURANT: "Carburant", AUTRE: "Autre",
};
const eur = (c: number) => (c / 100).toFixed(2).replace(".", ",");
const fdate = (d: Date) => d.toLocaleDateString("fr-FR");

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }
  const db = await getTenantDb();
  const rows = await db.depenseCentre.findMany({ orderBy: { date: "desc" } });

  const sheet = buildSheet("Charges", rows, [
    { header: "Date", value: (r) => fdate(r.date) },
    { header: "Catégorie", value: (r) => (r.categorie === "AUTRE" ? r.categorieAutre || "Autre" : CAT_LABEL[r.categorie]) },
    { header: "Libellé", value: (r) => r.libelle ?? "" },
    { header: "N° pièce", value: (r) => r.numeroPiece ?? "" },
    { header: "Montant (€)", value: (r) => eur(r.montantCents) },
    { header: "Statut", value: (r) => (r.statut === "PAYE" ? "Payé" : "En attente") },
  ]);

  return exportResponse({ req, basename: "charges-centre", title: "Charges du centre", sheets: [sheet] });
}
