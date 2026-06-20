import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { toCsv, csvResponse, dateStamp } from "@/lib/export-csv";

export const runtime = "nodejs";

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];
const fdate = (d: Date | null | undefined) => (d ? d.toLocaleDateString("fr-FR") : "");

// Export CSV des sessions de l'organisme (Excel FR).
export async function GET() {
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

  const csv = toCsv(rows, [
    { header: "Formation", value: (r) => r.formation.titre },
    { header: "Début", value: (r) => fdate(r.dateDebut) },
    { header: "Fin", value: (r) => fdate(r.dateFin) },
    { header: "Modalité", value: (r) => r.modalite },
    { header: "Places", value: (r) => r.nbPlaces },
    { header: "Inscrits", value: (r) => r._count.inscriptions },
    { header: "Statut", value: (r) => r.statut },
    { header: "Date examen", value: (r) => fdate(r.dateExamen) },
  ]);

  return csvResponse(`sessions-${dateStamp()}.csv`, csv);
}
