// Génération de CSV pour les exports (compatible Excel FR : séparateur « ; » +
// BOM UTF-8). Utilisé par les routes d'export tenant-scopées.

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

function esc(v: unknown): string {
  let s = v == null ? "" : String(v);
  // Anti-injection de formule (CSV/Excel/Sheets) : une cellule commençant par
  // = + - @ (ou tabulation / retour chariot) peut être exécutée à l'ouverture.
  // On la neutralise en la préfixant d'une apostrophe (affichée comme texte).
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Construit le contenu CSV (séparateur point-virgule, fins de ligne CRLF). */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => esc(c.header)).join(";");
  const body = rows.map((r) => columns.map((c) => esc(c.value(r))).join(";")).join("\r\n");
  return head + "\r\n" + body;
}

/** Variante CSV à partir d'une matrice déjà aplatie (en-tête + lignes). */
export function toCsvMatrix(
  header: string[],
  rows: (string | number | null)[][],
): string {
  const head = header.map(esc).join(";");
  const body = rows.map((r) => r.map(esc).join(";")).join("\r\n");
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
