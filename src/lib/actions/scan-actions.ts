"use server";

import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import {
  storeUpload,
  parseDataUrl,
  extFromMime,
  detectFileType,
  isRasterImage,
} from "@/lib/blob";

// PDF multi-pages scanné sur place : plafond un peu plus élevé qu'une pièce simple.
const MAX_BYTES = 15 * 1024 * 1024; // 15 Mo
const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];

/**
 * Rattache au dossier du candidat un document SCANNÉ sur place par un
 * collaborateur (tablette / mobile), en général un PDF multi-pages. Authentifié
 * et cloisonné par organisme (getTenantDb). Marque la pièce attendue « reçue ».
 */
export async function attachScannedPiece(
  inscriptionId: string,
  input: { dataUrl: string; piece?: string; filename?: string },
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string))
    return { ok: false, error: "Non autorisé." };

  const db = await getTenantDb();
  const insc = await db.inscription.findUnique({
    where: { id: inscriptionId },
    select: {
      id: true,
      organismeId: true,
      candidatId: true,
      piecesRecues: true,
      session: { select: { formation: { select: { piecesAttendues: true } } } },
    },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };

  const parsed = parseDataUrl(input.dataUrl);
  if (!parsed) return { ok: false, error: "Document illisible." };
  if (parsed.data.byteLength > MAX_BYTES)
    return { ok: false, error: "Document trop volumineux (max 15 Mo)." };
  // Type vérifié sur les octets (anti fichier déguisé).
  const detected = detectFileType(parsed.data);
  if (detected !== "application/pdf" && !isRasterImage(detected))
    return { ok: false, error: "Format inattendu (PDF ou image)." };

  const url = await storeUpload({
    data: parsed.data,
    folder: `dossiers/${insc.candidatId}`,
    ext: extFromMime(detected!),
    contentType: detected!,
  });

  const attendues = insc.session.formation.piecesAttendues ?? [];
  const label =
    input.piece && attendues.includes(input.piece)
      ? input.piece
      : input.filename?.trim() || "Document scanné";

  await db.pieceJointe.create({
    data: {
      organismeId: insc.organismeId,
      candidatId: insc.candidatId,
      label,
      categorie: "ADMINISTRATIF",
      url,
      mimeType: detected!,
      taille: parsed.data.byteLength,
    },
  });

  if (
    input.piece &&
    attendues.includes(input.piece) &&
    !insc.piecesRecues.includes(input.piece)
  ) {
    await db.inscription.update({
      where: { id: insc.id },
      data: { piecesRecues: { set: [...insc.piecesRecues, input.piece] } },
    });
  }

  revalidatePath(`/candidats/${insc.candidatId}`);
  return { ok: true };
}
