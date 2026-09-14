import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { buildSuivi6MoisRow } from "@/lib/suivi6mois-listing";
import { buildSuivi6MoisCsv, type SuiviCsvRow } from "@/lib/suivi6mois-csv";
import { SUIVI_6MOIS_STATUT_LABELS } from "@/lib/suivi6mois";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Export CSV du suivi à 6 mois (Qualiopi ind. 11), pour présentation en audit.
const STAFF = ["ADMIN", "RESPONSABLE_FORMATION"];

const fr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "");

export async function GET() {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }
  const db = await getTenantDb();
  const now = new Date();
  const inscriptions = await db.inscription.findMany({
    where: { statut: { not: "ANNULEE" } },
    include: { candidat: true, session: { include: { formation: true } } },
    orderBy: { session: { dateFin: "desc" } },
  });

  const rows: SuiviCsvRow[] = inscriptions.map((i) => {
    const row = buildSuivi6MoisRow(
      {
        id: i.id,
        candidatPrenom: i.candidat.prenom,
        candidatNom: i.candidat.nom,
        candidatEmail: i.candidat.email,
        formationTitre: i.session.formation.titre,
        dateFin: i.session.dateFin,
        suivi6moisToken: i.suivi6moisToken,
        suivi6moisSentAt: i.suivi6moisSentAt,
        suivi6moisRelanceAt: i.suivi6moisRelanceAt,
        suivi6moisRelanceCount: i.suivi6moisRelanceCount,
        suivi6moisCompletedAt: i.suivi6moisCompletedAt,
        suivi6moisJson: i.suivi6moisJson,
      },
      now,
    );
    return {
      candidat: row.candidat,
      email: row.email,
      formation: row.formation,
      dateFin: fr(row.dateFin),
      echeance: fr(row.echeance),
      statut: SUIVI_6MOIS_STATUT_LABELS[row.statut],
      envoyeLe: fr(row.envoyeLe),
      relanceLe: fr(row.relanceLe),
      relanceCount: row.relanceCount,
      reponduLe: fr(row.reponduLe),
      situation: row.situation,
      lienFormation: row.lienFormation,
      poste: row.poste,
      employeur: row.employeur,
      apport: row.apport,
    };
  });

  const csv = buildSuivi6MoisCsv(rows);
  const today = now.toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="suivi-6mois-${today}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
