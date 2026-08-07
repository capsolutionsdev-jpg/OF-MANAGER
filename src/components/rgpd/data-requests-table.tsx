"use client";

import { useMemo, useState } from "react";
import { processDataRequest } from "@/lib/actions/rgpd-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TYPE_LABELS, STATUT_LABELS } from "./labels";

export type DataRequestRow = {
  id: string;
  subjectEmail: string;
  type: string;
  statut: string;
  requestedAt: string; // ISO
};

const STATUT_FILTERS: { value: string; label: string }[] = [
  { value: "TOUS", label: "Tous les statuts" },
  { value: "RECUE", label: "Reçue" },
  { value: "EN_COURS", label: "En cours" },
  { value: "TRAITEE", label: "Traitée" },
  { value: "REFUSEE", label: "Refusée" },
];

const selectCx =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/** Demandes d'exercice des droits : table d'abord, filtrable par statut ;
 * l'action « Marquer traitée » reste une server action. */
export function DataRequestsTable({ rows }: { rows: DataRequestRow[] }) {
  const [statut, setStatut] = useState("TOUS");

  const filtered = useMemo(
    () => (statut === "TOUS" ? rows : rows.filter((r) => r.statut === statut)),
    [rows, statut],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <select
          value={statut}
          onChange={(e) => setStatut(e.target.value)}
          className={selectCx}
          aria-label="Filtrer par statut"
        >
          {STATUT_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border">
        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {rows.length === 0
              ? "Aucune demande enregistrée."
              : "Aucune demande ne correspond à ce filtre."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Demandeur</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Reçue le</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.subjectEmail}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {TYPE_LABELS[r.type] ?? r.type}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.statut === "TRAITEE" ? "default" : "secondary"}>
                      {STATUT_LABELS[r.statut] ?? r.statut}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(r.requestedAt).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.statut !== "TRAITEE" ? (
                      <form action={processDataRequest}>
                        <input type="hidden" name="id" value={r.id} />
                        <Button type="submit" size="sm" variant="outline">
                          Marquer traitée
                        </Button>
                      </form>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
