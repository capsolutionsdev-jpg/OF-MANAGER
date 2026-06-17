import { getTenantDb } from "@/lib/tenant";
import { fillGrilleInrs } from "@/lib/documents/inrs-grille";

export const dynamic = "force-dynamic";

const fr = (d: Date | null | undefined) => (d ? d.toLocaleDateString("fr-FR") : "");

/**
 * Grille de certification INRS PRÉ-REMPLIE (SST / MAC SST) pour une inscription.
 * Document officiel ouvert et complété sur ses champs d'identité ; l'évaluation
 * des compétences reste à la main du formateur.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ inscriptionId: string }> },
) {
  const { inscriptionId } = await params;
  const db = await getTenantDb();
  const insc = await db.inscription.findUnique({
    where: { id: inscriptionId },
    include: {
      candidat: { select: { nom: true, prenom: true, dateNaissance: true } },
      session: {
        include: {
          formation: { select: { grilleInrs: true, titre: true } },
          formateurs: { select: { nom: true, prenom: true }, take: 1 },
        },
      },
    },
  });
  if (!insc) return new Response("Inscription introuvable", { status: 404 });

  const grille = insc.session.formation.grilleInrs;
  if (!grille) {
    return new Response("Cette formation n'a pas de grille de certification INRS.", { status: 400 });
  }

  const formateur = insc.session.formateurs[0];
  const pdf = await fillGrilleInrs(grille, {
    nom: insc.candidat.nom,
    prenom: insc.candidat.prenom,
    dateNaissance: fr(insc.candidat.dateNaissance),
    dateDebut: fr(insc.session.dateDebut),
    dateFin: fr(insc.session.dateFin),
    nomFormateur: formateur?.nom ?? "",
    prenomFormateur: formateur?.prenom ?? "",
    dateCertification: fr(insc.certificationDate ?? insc.session.dateFin),
  });
  if (!pdf) return new Response("Grille INRS inconnue.", { status: 400 });

  const safe = `${insc.candidat.nom}_${insc.candidat.prenom}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="grille-${grille}-${safe}.pdf"`,
    },
  });
}
