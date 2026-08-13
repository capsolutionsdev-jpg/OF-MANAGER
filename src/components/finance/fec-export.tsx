"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";

/**
 * Export comptable FEC : choix de l'exercice + téléchargement du fichier
 * normalisé (à transmettre à l'expert-comptable / l'administration).
 */
export function FecExport({ years }: { years: number[] }) {
  const [year, setYear] = useState(years[0]);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Export comptable (FEC)</p>
        <p className="text-xs text-muted-foreground">
          Fichier des Écritures Comptables normalisé (ventes, encaissements, charges).
          Importable par votre expert-comptable.
        </p>
      </div>
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
        href={`/tresorerie/export/fec?year=${year}`}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        <FileDown className="h-4 w-4" /> Télécharger le FEC
      </a>
    </div>
  );
}
