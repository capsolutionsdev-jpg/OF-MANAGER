"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { orgConfigFor } from "@/lib/org-identity";
import { storeUpload } from "@/lib/blob";
import { generateFicheExpressionBesoinPdf } from "@/lib/documents/fiche-expression-besoin";

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];

/**
 * Génère la « fiche d'expression du besoin » (PDF horodaté) à partir des données
 * du candidat et l'archive en pièce jointe sur sa fiche. Preuve Qualiopi (ind. 4).
 * Appelée depuis un bouton de la fiche candidat.
 *
 * Sécurité (multi-tenant / IDOR) : réservé au STAFF, et le candidat est résolu
 * via getTenantDb() → cloisonné à l'organisme de l'utilisateur connecté. Un
 * compte d'un autre organisme (ou un rôle non-staff) ne peut PAS générer de fiche
 * sur un candidat qui ne lui appartient pas.
 */
export async function genererFicheExpressionBesoin(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string)) return;

  const candidatId = String(formData.get("candidatId") ?? "").trim();
  if (!candidatId) return;

  const db = await getTenantDb();
  const c = await db.candidat.findFirst({
    where: { id: candidatId },
    include: { formationSouhaitee: { select: { titre: true } } },
  });
  if (!c) return; // introuvable OU appartenant à un autre organisme

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

  await db.pieceJointe.create({
    data: {
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
