import { promises as fs } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import HTMLtoDOCX from "@turbodocx/html-to-docx";
import { prisma } from "@/lib/prisma";
import { DOCUMENTS, renderTemplate } from "@/lib/documents/templates";
import { buildVariables } from "@/lib/documents/resolve";

const DOC_STYLE = `<style>
  h1 { font-size: 18pt; text-align: center; margin-bottom: 16pt; }
  h2 { font-size: 12pt; margin: 12pt 0 4pt; }
  p, td, th, li { font-size: 10pt; line-height: 1.5; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  td, th { border: 1px solid #888; padding: 4px 6px; }
  .doc-footer { font-size: 8pt; color: #555; margin-top: 16pt; }
</style>`;

export type ZipResult = {
  data: Uint8Array;
  filename: string;
} | null;

/**
 * Génère le ZIP de tous les documents d'une inscription.
 * `only` permet de limiter à certains types (ex. ["FICHE_INSCRIPTION", ...]).
 */
export async function buildInscriptionDocsZip(
  inscriptionId: string,
  only?: string[],
): Promise<ZipResult> {
  const inscription = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    include: { candidat: true, session: { include: { formation: true } } },
  });
  if (!inscription) return null;

  const vars = buildVariables(inscription);

  // Images encodées en base64 (html-to-docx ne charge pas les URL).
  const pub = path.join(process.cwd(), "public");
  const [logoBuf, stampBuf] = await Promise.all([
    fs.readFile(path.join(pub, "cap-competences-logo.png")),
    fs.readFile(path.join(pub, "signature-cap-competences.png")),
  ]);
  const logo64 = `data:image/png;base64,${logoBuf.toString("base64")}`;
  const stamp64 = `data:image/png;base64,${stampBuf.toString("base64")}`;
  const inlineImages = (html: string) =>
    html
      .split("/cap-competences-logo.png").join(logo64)
      .split("/signature-cap-competences.png").join(stamp64);

  const zip = new JSZip();
  const safeName = (vars.nom_complet || "candidat")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-");
  const folder = zip.folder(`Documents-${safeName}`) ?? zip;

  const entries = Object.entries(DOCUMENTS).filter(
    ([type]) => !only || only.includes(type),
  );

  for (const [, doc] of entries) {
    const inner = inlineImages(renderTemplate(doc.html, vars));
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8" />${DOC_STYLE}</head><body>${inner}</body></html>`;
    const result = (await HTMLtoDOCX(fullHtml, undefined, {
      table: { row: { cantSplit: true } },
      footer: false,
      pageNumber: false,
    })) as Buffer | ArrayBuffer | Blob;

    let data: Buffer | Uint8Array;
    if (result instanceof Blob) data = new Uint8Array(await result.arrayBuffer());
    else if (result instanceof ArrayBuffer) data = new Uint8Array(result);
    else data = result;

    folder.file(`${doc.label}.docx`, data);
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  return {
    data: new Uint8Array(zipBuffer),
    filename: `documents-${safeName}.zip`,
  };
}
