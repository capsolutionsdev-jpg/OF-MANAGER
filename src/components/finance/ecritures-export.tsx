"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";

const FORMATS: { value: string; label: string }[] = [
  { value: "tableur", label: "Tableur (Excel / LibreOffice)" },
  { value: "pennylane", label: "Pennylane" },
  { value: "sage", label: "Sage" },
  { value: "ebp", label: "EBP" },
  { value: "cegid", label: "Cegid" },
];

/**
 * Export des écritures au format du logiciel comptable choisi (CSV).
 * Le FEC reste l'import universel ; ce CSV facilite les imports « journal ».
 */
export function EcrituresExport({ years }: { years: number[] }) {
  const [year, setYear] = useState(years[0]);
  const [format, setFormat] = useState("tableur");
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Export vers votre logiciel comptable</p>
        <p className="text-xs text-muted-foreground">
          Écritures au format CSV (Sage, EBP, Cegid, Pennylane…). À l&apos;import, votre logiciel peut
          vous demander d&apos;associer les colonnes.
        </p>
      </div>
      <select
        className="h-9 rounded-md border bg-background px-2 text-sm"
        value={format}
        onChange={(e) => setFormat(e.target.value)}
        aria-label="Logiciel comptable"
      >
        {FORMATS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>
      <select
        className="h-9 rounded-md border bg-background px-2 text-sm"
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        aria-label="Exercice comptable"
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <a
        href={`/tresorerie/export/ecritures?year=${year}&format=${format}`}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-muted"
      >
        <FileSpreadsheet className="h-4 w-4" /> Télécharger
      </a>
    </div>
  );
}
