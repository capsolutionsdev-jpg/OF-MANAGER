"use server";

import { revalidatePath } from "next/cache";
import { getCurrentEntreprise } from "@/lib/entreprise-portal";
import { getTenantDb } from "@/lib/tenant";
import { storeUpload } from "@/lib/blob";
import { validatePdfDataUrl } from "@/lib/pdf-upload";

/**
 * CLIENT (rôle ENTREPRISE) : dépose l'enquête de satisfaction REMPLIE + signée.
 *
 * Scopé à SES documents (anti-IDOR) via `inscription.entrepriseId` — rappel :
 * getTenantDb ne filtre QUE par organisme, jamais par entreprise.
 *
 * Pas de changement de schéma : on remplace le fichier vierge par la version
 * remplie et on marque l'état « retourné » dans `variablesJson`.
 */
export async function uploadSatisfactionRemplie(
  documentId: string,
  dataUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const entreprise = await getCurrentEntreprise();
  if (!entreprise) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();

  const doc = await db.documentGenere.findFirst({
    where: {
      id: documentId,
      type: "SATISFACTION_ENTREPRISE",
      inscription: { entrepriseId: entreprise.id },
    },
    select: { id: true, variablesJson: true },
  });
  if (!doc) return { ok: false, error: "Document introuvable." };

  const v = validatePdfDataUrl(dataUrl);
  if (!v.ok) return v;

  const fileUrl = await storeUpload({
    data: v.data,
    folder: `documents/retour/${documentId}`,
    ext: "pdf",
    contentType: "application/pdf",
  });

  const base =
    doc.variablesJson && typeof doc.variablesJson === "object" && !Array.isArray(doc.variablesJson)
      ? (doc.variablesJson as Record<string, unknown>)
      : {};

  await db.documentGenere.update({
    where: { id: doc.id },
    data: {
      fileUrl,
      variablesJson: { ...base, retourne: true, retourneLe: new Date().toISOString() },
    },
  });

  revalidatePath("/espace-entreprise/documents");
  return { ok: true };
}
