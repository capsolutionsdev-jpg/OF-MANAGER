import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { toCsv, csvResponse, dateStamp } from "@/lib/export-csv";

export const runtime = "nodejs";

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];

// Export CSV de tous les candidats de l'organisme (Excel FR).
export async function GET() {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }
  const db = await getTenantDb();
  const rows = await db.candidat.findMany({
    orderBy: { createdAt: "desc" },
    include: { formationSouhaitee: { select: { titre: true } } },
  });

  const csv = toCsv(rows, [
    { header: "Nom", value: (r) => r.nom },
    { header: "Prénom", value: (r) => r.prenom },
    { header: "E-mail", value: (r) => r.email },
    { header: "Téléphone", value: (r) => r.telephone },
    { header: "Ville", value: (r) => r.ville },
    { header: "Statut", value: (r) => r.statut },
    { header: "Étape CRM", value: (r) => r.crmStage },
    { header: "Formation souhaitée", value: (r) => r.formationSouhaitee?.titre },
    { header: "Source", value: (r) => r.sourceConnaissance },
    { header: "Handicap déclaré", value: (r) => (r.situationHandicap ? "Oui" : "Non") },
    { header: "Créé le", value: (r) => r.createdAt.toLocaleDateString("fr-FR") },
  ]);

  return csvResponse(`candidats-${dateStamp()}.csv`, csv);
}
