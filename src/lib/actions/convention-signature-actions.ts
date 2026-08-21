"use server";

import { revalidatePath } from "next/cache";
import { getCurrentEntreprise } from "@/lib/entreprise-portal";
import { getTenantDb, requireStaffTenant } from "@/lib/tenant";
import { storeUpload, parseDataUrl, detectFileType } from "@/lib/blob";
import { generateAndStoreConventionPdf } from "@/lib/documents/convention-pdf";

const MAX_BYTES = Math.floor(3.5 * 1024 * 1024); // ~3,5 Mo (base64 < 5 Mo Server Action)

type PdfCheck = { ok: true; data: Uint8Array } | { ok: false; error: string };

function validatePdf(dataUrl: string): PdfCheck {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return { ok: false, error: "Fichier illisible." };
  const realType = detectFileType(Buffer.from(parsed.data));
  if (parsed.mime !== "application/pdf" || realType !== "application/pdf") {
    return { ok: false, error: "Le fichier doit être un PDF." };
  }
  if (parsed.data.byteLength > MAX_BYTES) {
    return { ok: false, error: "PDF trop volumineux (max 3,5 Mo)." };
  }
  return { ok: true, data: parsed.data };
}

function storeSigned(conventionId: string, data: Uint8Array): Promise<string> {
  return storeUpload({
    data,
    folder: `conventions/${conventionId}/signee`,
    ext: "pdf",
    contentType: "application/pdf",
  });
}

/**
 * CLIENT (rôle ENTREPRISE) : dépose la convention SIGNÉE. Scopé à SA convention
 * (anti-IDOR). N'active PAS la validation : l'OF valide ensuite (signerConvention).
 */
export async function uploadConventionSigneeClient(
  conventionId: string,
  dataUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const entreprise = await getCurrentEntreprise();
  if (!entreprise) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();

  const conv = await db.convention.findFirst({
    where: { id: conventionId, entrepriseId: entreprise.id },
    select: { id: true, signatureStatut: true },
  });
  if (!conv) return { ok: false, error: "Convention introuvable." };
  if (conv.signatureStatut === "SIGNEE") {
    return { ok: false, error: "Cette convention est déjà validée." };
  }

  const v = validatePdf(dataUrl);
  if (!v.ok) return v;

  const fileUrlSigne = await storeSigned(conventionId, v.data);
  await db.convention.update({ where: { id: conventionId }, data: { fileUrlSigne } });

  revalidatePath("/espace-entreprise/convention");
  return { ok: true };
}

/**
 * STAFF : dépose la convention SIGNÉE reçue par un autre canal (mail, courrier).
 * Réservé au personnel de l'organisme (tenant courant).
 */
export async function uploadConventionSigneeStaff(
  conventionId: string,
  dataUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const { db } = await requireStaffTenant();

  const conv = await db.convention.findFirst({
    where: { id: conventionId },
    select: { id: true, entrepriseId: true },
  });
  if (!conv) return { ok: false, error: "Convention introuvable." };

  const v = validatePdf(dataUrl);
  if (!v.ok) return v;

  const fileUrlSigne = await storeSigned(conventionId, v.data);
  await db.convention.update({ where: { id: conventionId }, data: { fileUrlSigne } });

  if (conv.entrepriseId) revalidatePath(`/clients-pro/${conv.entrepriseId}`);
  return { ok: true };
}

/**
 * STAFF : (re)génère le PDF de la convention (utile si la génération à la
 * confirmation a échoué, ou si le prix a changé). Réservé au personnel du tenant.
 */
export async function regenererConventionPdf(
  conventionId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { db } = await requireStaffTenant();

  const conv = await db.convention.findFirst({
    where: { id: conventionId },
    select: { id: true, entrepriseId: true },
  });
  if (!conv) return { ok: false, error: "Convention introuvable." };

  const url = await generateAndStoreConventionPdf(conventionId);
  if (!url) return { ok: false, error: "La génération du PDF a échoué. Réessayez." };

  if (conv.entrepriseId) revalidatePath(`/clients-pro/${conv.entrepriseId}`);
  return { ok: true };
}
