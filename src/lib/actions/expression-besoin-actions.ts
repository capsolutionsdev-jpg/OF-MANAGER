"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { orgConfigFor } from "@/lib/org-identity";
import { storeUpload } from "@/lib/blob";
import { generateFicheExpressionBesoinPdf } from "@/lib/documents/fiche-expression-besoin";

// [DEBUG TEMPORAIRE] journalise le déroulé/erreur dans AuditLog (logs Vercel
// inaccessibles en offre gratuite). À retirer après diagnostic.
async function dbg(marker: string, detail: string) {
  try {
    await prisma.auditLog.create({
      data: {
        organismeId: process.env.VITRINE_ORGANISME_ID || null,
        action: marker,
        entityType: "FicheDebug",
        entityId: detail.slice(0, 900),
      },
    });
  } catch {
    /* ne jamais faire échouer le debug */
  }
}

/**
 * Génère la « fiche d'expression du besoin » (PDF horodaté) à partir des
 * données du candidat et l'archive en pièce jointe sur sa fiche.
 * Preuve Qualiopi (indicateur 4). Appelée depuis un bouton de la fiche candidat.
 */
export async function genererFicheExpressionBesoin(formData: FormData): Promise<void> {
  let step = "start";
  try {
    const session = await auth();
    if (!session?.user) return;

    const candidatId = String(formData.get("candidatId") ?? "").trim();
    if (!candidatId) return;

    step = "findCandidat";
    const c = await prisma.candidat.findUnique({
      where: { id: candidatId },
      include: { formationSouhaitee: { select: { titre: true } } },
    });
    if (!c) {
      await dbg("FICHE_NOCAND", candidatId);
      return;
    }

    step = "orgConfig";
    const org = await orgConfigFor(c.organismeId);

    step = "generatePdf(puppeteer/chromium)";
    const pdf = await generateFicheExpressionBesoinPdf(
      c,
      c.formationSouhaitee?.titre ?? null,
      org,
    );

    step = `storeUpload (pdf ${pdf.byteLength}o)`;
    const url = await storeUpload({
      data: pdf,
      folder: `dossiers/${candidatId}`,
      ext: "pdf",
      contentType: "application/pdf",
    });

    step = "pieceJointe.create";
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
    await dbg("FICHE_OK", step);
  } catch (e) {
    const msg =
      e instanceof Error
        ? `${e.name}: ${e.message} @ ${step} | ${(e.stack || "").split("\n").slice(1, 4).join(" ")}`
        : `${String(e)} @ ${step}`;
    await dbg("FICHE_ERROR", msg);
    throw e;
  }
}
