import { put } from "@vercel/blob";

/**
 * Stockage d'un fichier uploadé.
 * - Prod (Vercel) si `BLOB_READ_WRITE_TOKEN` défini → Vercel Blob, URL publique pérenne.
 * - Sinon (dev/local) → repli data-URL base64 (fonctionne sans token).
 * Source unique utilisée par la route /api/upload (authentifiée) ET les dépôts
 * publics par token (dossier candidat, factures formateur…).
 */
export async function storeUpload(opts: {
  data: Uint8Array | Buffer;
  folder: string;
  ext: string;
  contentType?: string;
}): Promise<string> {
  const { data, folder, ext, contentType } = opts;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(`${folder}/${Date.now()}.${ext}`, Buffer.from(data), {
        access: "public",
        addRandomSuffix: true,
        contentType: contentType || undefined,
      });
      return blob.url;
    } catch (e) {
      // Blob indisponible / token invalide / store mal configuré : on ne perd
      // JAMAIS l'upload → repli sur une data: URL (servie via les routes de
      // téléchargement). L'erreur est loggée pour diagnostic (token à vérifier).
      console.error("storeUpload: échec Vercel Blob, repli data: URL —", e);
    }
  }
  const b64 = Buffer.from(data).toString("base64");
  return `data:${contentType || "application/octet-stream"};base64,${b64}`;
}

// Types réellement acceptés (déduits des octets d'en-tête, pas du MIME annoncé).
const RASTER_IMAGES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

/**
 * Détecte le vrai type d'un fichier d'après ses octets d'en-tête (magic bytes).
 * Renvoie le MIME détecté ou null si non reconnu. NB : SVG est volontairement
 * non reconnu (vecteur XSS) → toujours rejeté.
 */
export function detectFileType(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Le type détecté est-il une image matricielle sûre ? */
export function isRasterImage(mime: string | null): boolean {
  return !!mime && RASTER_IMAGES.has(mime);
}

/** Décode un data-URL (`data:<mime>;base64,<...>`) en { mime, data }. */
export function parseDataUrl(dataUrl: string): { mime: string; data: Buffer } | null {
  const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!m) return null;
  return { mime: m[1], data: Buffer.from(m[2], "base64") };
}

/** Extension de fichier déduite d'un type MIME (repli "bin"). */
export function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
  };
  return map[mime] ?? "bin";
}
