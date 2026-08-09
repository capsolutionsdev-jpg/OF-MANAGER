/**
 * Mini-parseur CSV pour l'import de leads (console growth).
 * Gère les séparateurs `;` ou `,` (détection sur l'en-tête), les champs entre
 * guillemets et les guillemets doublés (""), le BOM Excel.
 */

/** Détecte le séparateur le plus probable d'une ligne d'en-tête. */
export function detectSeparator(headerLine: string): string {
  return (headerLine.match(/;/g)?.length ?? 0) >= (headerLine.match(/,/g)?.length ?? 0) ? ";" : ",";
}

/** Découpe une ligne CSV (champs entre guillemets, guillemets doublés). */
export function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === sep) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

/** Normalise un nom de colonne (minuscules, sans accents) pour le matching. */
export function normalizeHeader(h: string): string {
  return h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
