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
    const blob = await put(`${folder}/${Date.now()}.${ext}`, Buffer.from(data), {
      access: "public",
      addRandomSuffix: true,
      contentType: contentType || undefined,
    });
    return blob.url;
  }
  const b64 = Buffer.from(data).toString("base64");
  return `data:${contentType || "application/octet-stream"};base64,${b64}`;
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
    "image/svg+xml": "svg",
    "application/pdf": "pdf",
  };
  return map[mime] ?? "bin";
}
