"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { orgConfigFor } from "@/lib/org-identity";
import { storeUpload } from "@/lib/blob";
import { generateFicheExpressionBesoinPdf } from "@/lib/documents/fiche-expression-besoin";

/**
 * Génère la « fiche d'expression du besoin » (PDF horodaté) à partir des
 * données du candidat et l'archive en pièce jointe sur sa fiche.
 * Preuve Qualiopi (indicateur 4). Appelée depuis un bouton de la fiche candidat.
 */
export async function genererFicheExpressionBesoin(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;

  const candidatId = String(formData.get("candidatId") ?? "").trim();
  if (!candidatId) return;

  const c = await prisma.candidat.findUnique({
    where: { id: candidatId },
    include: { formationSouhaitee: { select: { titre: true } } },
  });
  if (!c) return;

  const org = await orgConfigFor(c.organismeId);
  const pdf = await generateFicheExpressionBesoinPdf(
    c,
    c.formationSouhaitee?.titre ?? null,
    org,
  );

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

  revalidatePath(`/candidats/${candidatId}`);
}
