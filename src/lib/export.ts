// Point d'entrée unique des exports tenant : choisit le format demandé
// (?format=csv|xlsx|pdf, CSV par défaut) et délègue au bon générateur.
// Toutes les routes d'export passent par ici pour offrir les 3 formats.

import { toCsvMatrix, csvResponse, dateStamp } from "./export-csv";
import { toXlsx, xlsxResponse, type SheetData } from "./export-xlsx";
import { tableToPdf, pdfResponse, type ExportOrgHeader } from "./export-pdf";
import { getCurrentOrganisme } from "./org";

export { buildSheet } from "./export-xlsx";
export type { SheetData } from "./export-xlsx";

export type ExportFormat = "csv" | "xlsx" | "pdf";

/** Lit le format demandé dans l'URL (CSV par défaut, rétro-compatible). */
export function pickFormat(req: Request): ExportFormat {
  const f = new URL(req.url).searchParams.get("format");
  return f === "xlsx" || f === "pdf" ? f : "csv";
}

/** En-tête de marque de l'organisme connecté (pour le PDF). */
export async function currentOrgHeader(): Promise<ExportOrgHeader | undefined> {
  const org = await getCurrentOrganisme();
  if (!org) return undefined;
  const sousTitre = [
    org.raisonSociale && org.raisonSociale !== org.nom ? org.raisonSociale : null,
    org.siret ? `SIRET ${org.siret}` : null,
    org.nda ? `NDA ${org.nda}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    nom: org.nom,
    sousTitre: sousTitre || null,
    logoUrl: org.logoUrl ?? null,
  };
}

/**
 * Construit la réponse d'export dans le format demandé.
 * - csv : la première feuille uniquement (un CSV = un tableau).
 * - xlsx : toutes les feuilles (onglets).
 * - pdf : toutes les feuilles, à la marque de l'OF.
 */
export async function exportResponse(opts: {
  req: Request;
  basename: string; // ex. "candidats" → candidats-2026-06-22.xlsx
  title: string; // titre affiché dans le PDF
  sheets: SheetData[];
}): Promise<Response> {
  const format = pickFormat(opts.req);
  const name = `${opts.basename}-${dateStamp()}`;

  if (format === "xlsx") {
    return xlsxResponse(`${name}.xlsx`, await toXlsx(opts.sheets));
  }
  if (format === "pdf") {
    const org = await currentOrgHeader();
    return pdfResponse(
      `${name}.pdf`,
      await tableToPdf({ title: opts.title, org, sheets: opts.sheets }),
    );
  }
  const s = opts.sheets[0] ?? { name: "", header: [], rows: [] };
  return csvResponse(`${name}.csv`, toCsvMatrix(s.header, s.rows));
}
