import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { orgConfigFor } from "@/lib/org-identity";
import { storeUpload } from "@/lib/blob";
import { generateFicheExpressionBesoinPdf } from "@/lib/documents/fiche-expression-besoin";

// Génération du PDF « fiche d'expression du besoin » (indicateur Qualiopi 4).
// ROUTE dédiée (et non server action) : seules les routes reçoivent le binaire
// @sparticuz/chromium via outputFileTracingIncludes (cf. next.config.ts).
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  // Réservé au personnel (pas aux apprenants) — génère un document interne.
  const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];
  if (!STAFF.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id: candidatId } = await params;
  const c = await prisma.candidat.findUnique({
    where: { id: candidatId },
    include: { formationSouhaitee: { select: { titre: true } } },
  });
  if (!c) {
    return NextResponse.json({ error: "Candidat introuvable." }, { status: 404 });
  }
  // Cloisonnement multi-tenant (RGPD/IDOR) : uniquement les candidats de
  // l'organisme de l'utilisateur (SUPERADMIN éditeur excepté).
  if (session.user.role !== "SUPERADMIN" && session.user.organismeId !== c.organismeId) {
    return NextResponse.json({ error: "Accès refusé (autre organisme)." }, { status: 403 });
  }

  const org = await orgConfigFor(c.organismeId);
  const pdf = await generateFicheExpressionBesoinPdf(
    c,
    c.formationSouhaitee?.titre ?? null,
    org,
  );

  // Archive en pièce jointe sur la fiche (preuve Qualiopi).
  try {
    const url = await storeUpload({
      data: pdf,
      folder: `dossiers/${candidatId}`,
      ext: "pdf",
      contentType: "application/pdf",
    });
    await prisma.pieceJointe.create({
      data: {
        organismeId: c.organismeId,
        candidatId,
        label: "Fiche d'expression du besoin",
        categorie: "QUALIOPI",
        url,
        mimeType: "application/pdf",
        taille: pdf.byteLength,
      },
    });
  } catch {
    // L'archivage ne doit pas empêcher l'affichage du PDF.
  }

  // Renvoie le PDF (ouvert dans un nouvel onglet).
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="fiche-expression-besoin-${candidatId}.pdf"`,
    },
  });
}
