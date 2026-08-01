import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { exportResponse, buildSheet } from "@/lib/export";

export const runtime = "nodejs";

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];

const STATUT_LABEL: Record<string, string> = {
  ENVOYE_CERTIFICATEUR: "Envoyé au certificateur",
  RECU: "Reçu",
  REMIS: "Remis",
};
const fdate = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR") : "");

/**
 * Export de l'inventaire des diplômes d'une formation (CSV / Excel / PDF).
 * Sert notamment aux envois annuels en préfecture (n° + nom).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }
  const { id } = await params;
  const db = await getTenantDb();
  const f = await db.formation.findUnique({ where: { id }, select: { titre: true, reference: true } });
  if (!f) return new Response("Formation introuvable", { status: 404 });

  const rows = await db.diplome.findMany({
    where: { formationId: id },
    orderBy: [{ numeroDiplome: "asc" }, { createdAt: "desc" }],
  });

  const sheet = buildSheet("Diplômes", rows, [
    { header: "N° de diplôme", value: (r) => r.numeroDiplome },
    { header: "Nom", value: (r) => r.nom },
    { header: "Prénom", value: (r) => r.prenom },
    { header: "Date de naissance", value: (r) => fdate(r.dateNaissance) },
    { header: "Lieu de naissance", value: (r) => r.lieuNaissance },
    { header: "Statut", value: (r) => STATUT_LABEL[r.statut] ?? r.statut },
    { header: "Remis le", value: (r) => fdate(r.remisAt) },
    { header: "Créé le", value: (r) => fdate(r.createdAt) },
  ]);

  return exportResponse({
    req,
    basename: `inventaire-diplomes-${f.reference || id}`,
    title: `Inventaire des diplômes — ${f.titre}`,
    sheets: [sheet],
  });
}
