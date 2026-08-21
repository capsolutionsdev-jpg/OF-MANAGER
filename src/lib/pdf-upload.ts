import "server-only";
import { parseDataUrl, detectFileType } from "@/lib/blob";

/** ~3,5 Mo : garde une marge sous la limite ~5 Mo (base64) des Server Actions. */
export const MAX_PDF_UPLOAD_BYTES = Math.floor(3.5 * 1024 * 1024);

export type PdfCheck = { ok: true; data: Uint8Array } | { ok: false; error: string };

/**
 * Valide une data-URL censée contenir un PDF, déposée par un utilisateur : vérifie
 * le type déclaré ET les octets réels (magic number, anti-usurpation d'extension)
 * et la taille. Renvoie les octets décodés si tout est bon.
 */
export function validatePdfDataUrl(
  dataUrl: string,
  maxBytes: number = MAX_PDF_UPLOAD_BYTES,
): PdfCheck {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return { ok: false, error: "Fichier illisible." };
  const realType = detectFileType(Buffer.from(parsed.data));
  if (parsed.mime !== "application/pdf" || realType !== "application/pdf") {
    return { ok: false, error: "Le fichier doit être un PDF." };
  }
  if (parsed.data.byteLength > maxBytes) {
    return { ok: false, error: "PDF trop volumineux (max 3,5 Mo)." };
  }
  return { ok: true, data: parsed.data };
}
