// Génération de CSV pour les exports (compatible Excel FR : séparateur « ; » +
// BOM UTF-8). Utilisé par les routes d'export tenant-scopées.

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

function esc(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Construit le contenu CSV (séparateur point-virgule, fins de ligne CRLF). */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => esc(c.header)).join(";");
  const body = rows.map((r) => columns.map((c) => esc(c.value(r))).join(";")).join("\r\n");
  return head + "\r\n" + body;
}

/** Réponse HTTP de téléchargement CSV (BOM pour ouverture directe dans Excel). */
export function csvResponse(filename: string, csv: string): Response {
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Suffixe de date pour les noms de fichiers (AAAA-MM-JJ). */
export function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
