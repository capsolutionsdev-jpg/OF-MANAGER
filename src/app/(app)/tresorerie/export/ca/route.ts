import { auth } from "@/auth";
import { exportRateLimited } from "@/lib/security/export-guard";
import { getTenantDb } from "@/lib/tenant";
import { exportResponse } from "@/lib/export";
import { buildSheet } from "@/lib/export-xlsx";

export const runtime = "nodejs";
const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION"];

const eur = (c: number) => (c / 100).toFixed(2).replace(".", ",");
const mkey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const mlabel = (k: string) => {
  const [y, m] = k.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
};

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }
  const limited = exportRateLimited(session.user.id);
  if (limited) return limited;
  const db = await getTenantDb();
  const [factures, civic] = await Promise.all([
    db.facture.findMany({ where: { statut: { in: ["ENVOYEE", "PAYEE", "PARTIELLE"] } }, select: { montantTTC: true, dateEmission: true } }),
    db.civicPaiement.findMany({ where: { statut: "paye" }, select: { montantCents: true, date: true } }),
  ]);
  const ca = new Map<string, number>();
  for (const f of factures) ca.set(mkey(f.dateEmission), (ca.get(mkey(f.dateEmission)) ?? 0) + Math.round(Number(f.montantTTC) * 100));
  for (const p of civic) ca.set(mkey(p.date), (ca.get(mkey(p.date)) ?? 0) + p.montantCents);
  const months = [...ca.keys()].sort().reverse();
  const data = months.map((m) => ({ m, ca: ca.get(m) ?? 0 }));

  const sheet = buildSheet("CA mensuel", data, [
    { header: "Mois", value: (r) => mlabel(r.m) },
    { header: "CA facturé (€)", value: (r) => eur(r.ca) },
  ]);
  return exportResponse({ req, basename: "ca-mensuel", title: "CA mensuel (toutes formations)", sheets: [sheet] });
}
