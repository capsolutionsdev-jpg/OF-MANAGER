// Export PDF d'un ou plusieurs tableaux, à la marque de l'organisme
// (en-tête : logo + nom + identité légale). Réutilise le rendu HTML → PDF
// (puppeteer) déjà en place. Orientation paysage par défaut (tableaux larges).

import { htmlToPdf } from "./pdf";
import type { SheetData } from "./export-xlsx";

/** En-tête de marque pour le PDF. */
export type ExportOrgHeader = {
  nom: string;
  sousTitre?: string | null;
  logoUrl?: string | null;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Échappement pour une valeur d'ATTRIBUT HTML (guillemets inclus). */
function escAttr(s: string): string {
  return esc(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function tableHtml(sheet: SheetData): string {
  const head = sheet.header.map((h) => `<th>${esc(h)}</th>`).join("");
  const body = sheet.rows
    .map(
      (r) =>
        `<tr>${r
          .map((v) => `<td>${v == null ? "" : esc(String(v))}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const count = sheet.rows.length;
  return `
    <section>
      <h2>${esc(sheet.name)} <span class="count">(${count} ligne${count > 1 ? "s" : ""})</span></h2>
      <table>
        <thead><tr>${head}</tr></thead>
        <tbody>${body || `<tr><td class="empty" colspan="${Math.max(1, sheet.header.length)}">Aucune donnée</td></tr>`}</tbody>
      </table>
    </section>`;
}

/** Construit le PDF d'export (octets) à partir d'une ou plusieurs feuilles. */
export async function tableToPdf(opts: {
  title: string;
  org?: ExportOrgHeader;
  sheets: SheetData[];
}): Promise<Uint8Array> {
  const dateStr = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const org = opts.org;
  const logo = org?.logoUrl
    ? `<img src="${escAttr(org.logoUrl)}" alt="" class="logo" />`
    : "";
  const header = `
    <header class="doc-head">
      <div class="brand">
        ${logo}
        <div>
          <div class="org-name">${esc(org?.nom ?? "")}</div>
          ${org?.sousTitre ? `<div class="org-sub">${esc(org.sousTitre)}</div>` : ""}
        </div>
      </div>
      <div class="meta">
        <div class="title">${esc(opts.title)}</div>
        <div class="date">Édité le ${dateStr}</div>
      </div>
    </header>`;

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"/>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1a2230; margin: 0; }
    .doc-head { display: flex; justify-content: space-between; align-items: flex-start;
      border-bottom: 2px solid #1A5FD4; padding-bottom: 8px; margin-bottom: 14px; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .logo { max-height: 46px; max-width: 160px; object-fit: contain; }
    .org-name { font-size: 14px; font-weight: 700; }
    .org-sub { font-size: 9px; color: #555; max-width: 280px; }
    .meta { text-align: right; }
    .title { font-size: 15px; font-weight: 700; }
    .date { font-size: 9px; color: #555; }
    h2 { font-size: 12px; margin: 14px 0 6px; }
    h2 .count { font-weight: 400; color: #777; font-size: 10px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #cfd6e0; padding: 4px 6px; font-size: 8.5px;
      text-align: left; vertical-align: top; word-break: break-word; }
    th { background: #eef2fb; font-weight: 700; }
    tbody tr:nth-child(even) { background: #f7f9fc; }
    td.empty { text-align: center; color: #999; font-style: italic; }
  </style></head>
  <body>${header}${opts.sheets.map(tableHtml).join("")}</body></html>`;

  return htmlToPdf(html, { landscape: true });
}

/** Réponse HTTP de téléchargement d'un PDF. */
export function pdfResponse(filename: string, bytes: Uint8Array): Response {
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
