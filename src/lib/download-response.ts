import "server-only";

/**
 * Construit une réponse HTTP de TÉLÉCHARGEMENT (Content-Disposition: attachment)
 * à partir d'une URL stockée — qu'elle soit une `data:` URL base64 (repli sans
 * Vercel Blob) OU une URL http(s) (Vercel Blob). Force le téléchargement au clic
 * au lieu d'un affichage inline / d'un blocage navigateur des data: URLs.
 */
export async function fileDownloadResponse(url: string | null | undefined, filename: string): Promise<Response> {
  if (!url) return new Response("Fichier indisponible.", { status: 404 });

  const safeName = filename.replace(/[^\w.\-]+/g, "_") || "document.pdf";
  let body: ArrayBuffer;
  let contentType = "application/pdf";

  if (url.startsWith("data:")) {
    const m = url.match(/^data:([^;,]*)(;base64)?,([\s\S]*)$/);
    if (!m) return new Response("Fichier illisible.", { status: 400 });
    if (m[1]) contentType = m[1];
    const buf = m[2]
      ? Buffer.from(m[3], "base64")
      : Buffer.from(decodeURIComponent(m[3]), "utf8");
    // Copie exacte des octets utiles → ArrayBuffer (BodyInit accepté par Response).
    body = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  } else {
    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      return new Response("Fichier indisponible.", { status: 502 });
    }
    if (!res.ok) return new Response("Fichier indisponible.", { status: 502 });
    contentType = res.headers.get("content-type") || contentType;
    body = await res.arrayBuffer();
  }

  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
