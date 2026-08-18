import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { exportRateLimited } from "@/lib/security/export-guard";
import { exportResponse, buildSheet } from "@/lib/export";

export const runtime = "nodejs";

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];

// Export de tous les candidats de l'organisme (CSV / Excel / PDF).
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }
  const limited = exportRateLimited(session.user.id);
  if (limited) return limited;
  const db = await getTenantDb();
  const rows = await db.candidat.findMany({
    orderBy: { createdAt: "desc" },
    include: { formationSouhaitee: { select: { titre: true } } },
  });

  const sheet = buildSheet("Candidats", rows, [
    { header: "Nom", value: (r) => r.nom },
    { header: "Prénom", value: (r) => r.prenom },
    { header: "E-mail", value: (r) => r.email },
    { header: "Téléphone", value: (r) => r.telephone },
    { header: "Ville", value: (r) => r.ville },
    { header: "Code postal", value: (r) => r.codePostal },
    { header: "Statut", value: (r) => r.statut },
    { header: "Étape CRM", value: (r) => r.crmStage },
    { header: "Formation souhaitée", value: (r) => r.formationSouhaitee?.titre },
    { header: "Source", value: (r) => r.sourceConnaissance },
    { header: "Handicap déclaré", value: (r) => (r.situationHandicap ? "Oui" : "Non") },
    { header: "Créé le", value: (r) => r.createdAt.toLocaleDateString("fr-FR") },
  ]);

  return exportResponse({ req, basename: "candidats", title: "Liste des candidats", sheets: [sheet] });
}
