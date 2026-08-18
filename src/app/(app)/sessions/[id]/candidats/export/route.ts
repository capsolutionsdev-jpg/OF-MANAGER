import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { exportRateLimited } from "@/lib/security/export-guard";
import { exportResponse, buildSheet } from "@/lib/export";

export const runtime = "nodejs";

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];
const fdate = (d: Date | null | undefined) => (d ? d.toLocaleDateString("fr-FR") : "");

const RESULTAT_LABELS: Record<string, string> = {
  NON_EVALUE: "Non évalué",
  CERTIFIE: "Certifié",
  AJOURNE: "Ajourné",
  ABANDON: "Abandon",
};

// Export de la liste des candidats inscrits à une session (CSV / Excel / PDF).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }
  const limited = exportRateLimited(session.user.id);
  if (limited) return limited;
  const { id } = await params;
  const db = await getTenantDb();

  // findFirst → scopé au tenant (404 si la session n'appartient pas à l'OF)
  const sess = await db.session.findFirst({
    where: { id },
    include: { formation: { select: { titre: true } } },
  });
  if (!sess) return new Response("Session introuvable", { status: 404 });

  const inscriptions = await db.inscription.findMany({
    where: { sessionId: id },
    orderBy: { candidat: { nom: "asc" } },
    include: {
      candidat: true,
      entreprise: { select: { raisonSociale: true } },
    },
  });

  const sheet = buildSheet("Candidats", inscriptions, [
    { header: "Nom", value: (r) => r.candidat.nom },
    { header: "Prénom", value: (r) => r.candidat.prenom },
    { header: "E-mail", value: (r) => r.candidat.email },
    { header: "Téléphone", value: (r) => r.candidat.telephone },
    { header: "Ville", value: (r) => r.candidat.ville },
    { header: "Entreprise", value: (r) => r.entreprise?.raisonSociale },
    { header: "Statut inscription", value: (r) => r.statut },
    { header: "Financement", value: (r) => r.financementType },
    { header: "Paiement", value: (r) => r.paiementStatut },
    { header: "Résultat", value: (r) => RESULTAT_LABELS[r.resultatCertification] ?? r.resultatCertification },
  ]);

  const dateStr = fdate(sess.dateDebut);
  const slug = sess.formation.titre.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40);
  return exportResponse({
    req,
    basename: `session-${slug}`,
    title: `Candidats — ${sess.formation.titre} (${dateStr})`,
    sheets: [sheet],
  });
}
