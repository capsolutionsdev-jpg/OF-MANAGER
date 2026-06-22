import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { exportResponse, buildSheet } from "@/lib/export";

export const runtime = "nodejs";

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION"];
const fdate = (d: Date | null | undefined) => (d ? d.toLocaleDateString("fr-FR") : "");
const oui = (v: unknown) => (v ? "Oui" : "Non");

const RESULTAT_LABELS: Record<string, string> = {
  NON_EVALUE: "Non évalué",
  CERTIFIE: "Certifié",
  AJOURNE: "Ajourné",
  ABANDON: "Abandon",
};

// Export des données pédagogiques : une ligne par inscription (suivi du parcours
// — positionnement, satisfaction, attestation, résultat de certification).
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }
  const db = await getTenantDb();
  const rows = await db.inscription.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      candidat: { select: { nom: true, prenom: true, email: true } },
      session: {
        select: {
          dateDebut: true,
          dateFin: true,
          modalite: true,
          formation: { select: { titre: true, piecesAttendues: true } },
        },
      },
    },
  });

  const sheet = buildSheet("Pédagogique", rows, [
    { header: "Nom", value: (r) => r.candidat.nom },
    { header: "Prénom", value: (r) => r.candidat.prenom },
    { header: "E-mail", value: (r) => r.candidat.email },
    { header: "Formation", value: (r) => r.session.formation.titre },
    { header: "Début", value: (r) => fdate(r.session.dateDebut) },
    { header: "Fin", value: (r) => fdate(r.session.dateFin) },
    { header: "Modalité", value: (r) => r.session.modalite },
    { header: "Statut", value: (r) => r.statut },
    { header: "Dossier signé", value: (r) => oui(r.signedAt) },
    {
      header: "Pièces reçues",
      value: (r) =>
        `${r.piecesRecues.length}/${r.session.formation.piecesAttendues?.length ?? 0}`,
    },
    { header: "Positionnement", value: (r) => oui(r.positionnementCompletedAt) },
    { header: "Satisfaction", value: (r) => oui(r.satisfactionCompletedAt) },
    { header: "Attestation de fin", value: (r) => oui(r.docsFinSentAt) },
    { header: "Résultat", value: (r) => RESULTAT_LABELS[r.resultatCertification] ?? r.resultatCertification },
    { header: "Date certification", value: (r) => fdate(r.certificationDate) },
  ]);

  return exportResponse({ req, basename: "pedagogique", title: "Données pédagogiques", sheets: [sheet] });
}
