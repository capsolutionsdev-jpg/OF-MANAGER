import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { exportResponse, buildSheet } from "@/lib/export";

export const runtime = "nodejs";

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];
const fdate = (d: Date | null | undefined) => (d ? d.toLocaleDateString("fr-FR") : "");

// Export des sessions de l'organisme (CSV / Excel / PDF).
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }
  const db = await getTenantDb();
  const rows = await db.session.findMany({
    orderBy: { dateDebut: "desc" },
    include: {
      formation: { select: { titre: true } },
      _count: { select: { inscriptions: true } },
    },
  });

  const sheet = buildSheet("Sessions", rows, [
    { header: "Formation", value: (r) => r.formation.titre },
    { header: "Début", value: (r) => fdate(r.dateDebut) },
    { header: "Fin", value: (r) => fdate(r.dateFin) },
    { header: "Modalité", value: (r) => r.modalite },
    { header: "Lieu", value: (r) => r.lieu },
    { header: "Places", value: (r) => r.nbPlaces },
    { header: "Inscrits", value: (r) => r._count.inscriptions },
    { header: "Statut", value: (r) => r.statut },
    { header: "Date examen", value: (r) => fdate(r.dateExamen) },
  ]);

  return exportResponse({ req, basename: "sessions", title: "Liste des sessions", sheets: [sheet] });
}
