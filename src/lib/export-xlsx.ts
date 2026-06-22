// Génération de fichiers Excel (.xlsx) sans dépendance supplémentaire :
// un .xlsx est une archive ZIP de fichiers XML (OOXML). On la construit avec
// JSZip (déjà présent). Les valeurs texte sont écrites en « inline strings »
// (pas de table partagée) : simple et robuste. Les chaînes ne sont jamais
// interprétées comme formules par Excel (seul un <f> l'est) → pas d'injection.

import JSZip from "jszip";
import type { CsvColumn } from "./export-csv";

/** Une feuille du classeur : nom d'onglet + en-tête + lignes aplaties. */
export type SheetData = {
  name: string;
  header: string[];
  rows: (string | number | null)[][];
};

/** Convertit des objets + colonnes (mêmes que le CSV) en feuille aplatie. */
export function buildSheet<T>(
  name: string,
  rows: T[],
  columns: CsvColumn<T>[],
): SheetData {
  return {
    name,
    header: columns.map((c) => c.header),
    rows: rows.map((r) =>
      columns.map((c) => {
        const v = c.value(r);
        return v == null ? null : v;
      }),
    ),
  };
}

function xmlEsc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Nom de colonne Excel à partir d'un index 0-based (0 → A, 26 → AA). */
function colLetter(n: number): string {
  let s = "";
  n += 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// Excel limite un nom d'onglet à 31 caractères et interdit : \ / ? * [ ] :
function safeSheetName(name: string, index: number): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31);
  return cleaned || `Feuille${index + 1}`;
}

function cell(ref: string, value: string | number | null, bold: boolean): string {
  const s = bold ? ' s="1"' : "";
  if (value == null || value === "") return `<c r="${ref}"${s}/>`;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}"${s}><v>${value}</v></c>`;
  }
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(String(value))}</t></is></c>`;
}

function sheetXml(sheet: SheetData): string {
  const lines: string[] = [];
  // Ligne d'en-tête (gras, style 1)
  lines.push(
    `<row r="1">${sheet.header
      .map((h, i) => cell(`${colLetter(i)}1`, h, true))
      .join("")}</row>`,
  );
  // Lignes de données
  sheet.rows.forEach((row, ri) => {
    const r = ri + 2;
    lines.push(
      `<row r="${r}">${row
        .map((v, ci) => cell(`${colLetter(ci)}${r}`, v, false))
        .join("")}</row>`,
    );
  });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${lines.join(
    "",
  )}</sheetData></worksheet>`;
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/** Construit un classeur .xlsx (multi-feuilles) → octets prêts à télécharger. */
export async function toXlsx(sheets: SheetData[]): Promise<Uint8Array> {
  const list = sheets.length ? sheets : [{ name: "Feuille1", header: [], rows: [] }];
  const names = list.map((s, i) => safeSheetName(s.name, i));

  const zip = new JSZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${list
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join("\n")}
</Types>`,
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
  );

  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
${names
      .map((n, i) => `<sheet name="${xmlEsc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join("\n")}
</sheets>
</workbook>`,
  );

  const stylesRid = list.length + 1;
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${list
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join("\n")}
<Relationship Id="rId${stylesRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
  );

  zip.file("xl/styles.xml", STYLES_XML);
  list.forEach((s, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)));

  return zip.generateAsync({ type: "uint8array" });
}

/** Réponse HTTP de téléchargement d'un fichier Excel. */
export function xlsxResponse(filename: string, bytes: Uint8Array): Response {
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
