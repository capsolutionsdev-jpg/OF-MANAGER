import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { CERTIFICATION_LABELS } from "@/lib/validators/inscription";
import { toCsvMatrix, csvResponse } from "@/lib/export-csv";

export const dynamic = "force-dynamic";

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];

/** Export CSV des résultats d'examen d'une session (pour déclaration au certificateur). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Garde de rôle (défense en profondeur, comme les autres routes d'export).
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }

  const { id } = await params;
  const db = await getTenantDb();
  const s = await db.session.findUnique({
    where: { id },
    include: {
      formation: { select: { titre: true, reference: true, certification: true } },
      inscriptions: {
        include: { candidat: { select: { nom: true, prenom: true, email: true, dateNaissance: true } } },
        orderBy: { candidat: { nom: "asc" } },
      },
    },
  });
  if (!s) return new Response("Session introuvable", { status: 404 });

  const fmt = (d: Date | null | undefined) => (d ? d.toLocaleDateString("fr-FR") : "");
  const header = [
    "Nom", "Prénom", "Email", "Date de naissance",
    "Formation", "Référence", "Certification",
    "Date d'examen", "Résultat", "Date de certification",
  ];
  // Anti-injection de formule CSV via toCsvMatrix/esc (les nom/prénom/email
  // viennent du formulaire lead public → potentiellement `=…`, `@…`, etc.).
  const rows = s.inscriptions.map((i) => [
    i.candidat.nom,
    i.candidat.prenom,
    i.candidat.email ?? "",
    fmt(i.candidat.dateNaissance),
    s.formation.titre,
    s.formation.reference,
    s.formation.certification ?? "",
    fmt(s.dateExamen),
    CERTIFICATION_LABELS[i.resultatCertification] ?? i.resultatCertification,
    fmt(i.certificationDate),
  ]);
  const ref = (s.reference || s.id).replace(/[^a-zA-Z0-9_-]/g, "_");
  return csvResponse(`resultats-${ref}.csv`, toCsvMatrix(header, rows));
}
