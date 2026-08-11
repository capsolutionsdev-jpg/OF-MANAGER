import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { orgConfigFor } from "@/lib/org-identity";
import { generateParcoursT3PPdf } from "@/lib/documents/parcours-t3p-pdf";

// Génération du PDF « fiche de suivi du parcours T3P » (Taxi/VTC — pièce Qualiopi).
// ROUTE dédiée (et non server action) : seules les routes reçoivent le binaire
// @sparticuz/chromium via outputFileTracingIncludes (cf. next.config.ts →
// PDF_ENTRYPOINTS doit contenir « /api/parcours-t3p »).
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await params;
  // getTenantDb : la requête est cloisonnée au tenant courant → un parcours d'un
  // autre organisme est introuvable (pas de fuite inter-tenant).
  const db = await getTenantDb();
  const p = await db.parcoursT3P.findUnique({
    where: { id },
    include: {
      epreuves: { orderBy: [{ type: "asc" }, { tentative: "asc" }] },
      candidat: { select: { prenom: true, nom: true, dateNaissance: true, email: true, telephone: true, organismeId: true } },
      inscription: { select: { session: { select: { formation: { select: { titre: true } } } } } },
    },
  });
  if (!p) {
    return NextResponse.json({ error: "Parcours introuvable." }, { status: 404 });
  }

  const org = await orgConfigFor(p.candidat.organismeId ?? p.organismeId);
  const pdf = await generateParcoursT3PPdf(
    {
      parcours: p,
      candidat: {
        prenom: p.candidat.prenom,
        nom: p.candidat.nom,
        dateNaissance: p.candidat.dateNaissance,
        email: p.candidat.email,
        telephone: p.candidat.telephone,
      },
      formationTitre: p.inscription?.session.formation.titre ?? null,
    },
    org,
  );

  const slug = `${p.candidat.nom}-${p.candidat.prenom}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="parcours-t3p-${slug}.pdf"`,
    },
  });
}
