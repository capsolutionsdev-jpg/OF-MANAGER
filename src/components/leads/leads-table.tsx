"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Lead récent aplati en données sérialisables (date ISO). */
export type LeadRow = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  canal: string;
  date: string; // ISO
};

const selectCx =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";
const headCx = "sticky top-0 z-10 bg-background";

export function LeadsTable({ rows }: { rows: LeadRow[] }) {
  const [canal, setCanal] = useState("");
  const canaux = useMemo(
    () => [...new Set(rows.map((r) => r.canal))].sort((a, b) => a.localeCompare(b, "fr")),
    [rows],
  );
  const filtered = useMemo(
    () => (canal ? rows.filter((r) => r.canal === canal) : rows),
    [rows, canal],
  );

  if (rows.length === 0) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        Aucun lead sur les 90 derniers jours.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label htmlFor="lead-canal" className="text-xs text-muted-foreground">
          Canal
        </label>
        <select
          id="lead-canal"
          value={canal}
          onChange={(e) => setCanal(e.target.value)}
          className={selectCx}
          aria-label="Filtrer par canal"
        >
          <option value="">Tous les canaux</option>
          {canaux.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} lead{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="rounded-lg border [&_[data-slot=table-container]]:max-h-[60vh] [&_[data-slot=table-container]]:overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={headCx}>Prospect</TableHead>
              <TableHead className={cn(headCx, "hidden md:table-cell")}>E-mail</TableHead>
              <TableHead className={headCx}>Canal</TableHead>
              <TableHead className={cn(headCx, "hidden text-right sm:table-cell")}>Reçu le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((l) => (
              <TableRow key={l.id} className="hover:bg-muted/40">
                <TableCell className="font-medium">
                  <Link href={`/candidats/${l.id}`} className="hover:underline">
                    {l.prenom} {l.nom}
                  </Link>
                  <div className="text-xs text-muted-foreground md:hidden">{l.email}</div>
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{l.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {l.canal}
                  </Badge>
                </TableCell>
                <TableCell className="hidden text-right text-muted-foreground sm:table-cell">
                  {new Date(l.date).toLocaleDateString("fr-FR")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
