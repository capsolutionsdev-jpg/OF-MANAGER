import { getTenantDb } from "@/lib/tenant";
import { CERTIFICATION_LABELS } from "@/lib/validators/inscription";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Export CSV des résultats d'examen d'une session (pour déclaration au certificateur). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
  const lines = [header.map(cell).join(";")];
  for (const i of s.inscriptions) {
    lines.push(
      [
        i.candidat.nom,
        i.candidat.prenom,
        i.candidat.email,
        fmt(i.candidat.dateNaissance),
        s.formation.titre,
        s.formation.reference,
        s.formation.certification ?? "",
        fmt(s.dateExamen),
        CERTIFICATION_LABELS[i.resultatCertification] ?? i.resultatCertification,
        fmt(i.certificationDate),
      ].map(cell).join(";"),
    );
  }
  // BOM UTF-8 pour Excel (accents).
  const csv = "﻿" + lines.join("\r\n");
  const ref = (s.reference || s.id).replace(/[^a-zA-Z0-9_-]/g, "_");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="resultats-${ref}.csv"`,
    },
  });
}
