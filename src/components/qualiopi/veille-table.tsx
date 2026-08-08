"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { supprimerVeille } from "@/lib/actions/registre-actions";

export const VEILLE_TYPES: Record<string, { label: string; ind: string; cls: string }> = {
  LEGALE: { label: "Veille légale & réglementaire", ind: "Indicateur 23", cls: "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  METIERS: { label: "Veille métiers & compétences", ind: "Indicateur 24", cls: "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  PEDAGOGIQUE: { label: "Veille pédagogique & technologique", ind: "Indicateur 25", cls: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
};

/** Entrée de veille sérialisée (date en ISO). */
export type VeilleRow = {
  id: string;
  type: string;
  date: string; // ISO
  source: string;
  sujet: string;
  resume: string | null;
  action: string | null;
  lien: string | null;
};

const selectCx =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";
const headCx = "sticky top-0 z-10 bg-background";

/** Registre de veille : table filtrable par type d'indicateur, en-têtes
 * collants. L'action de suppression reste une server action. */
export function VeilleTable({ rows }: { rows: VeilleRow[] }) {
  const [type, setType] = useState("TOUS");

  const filtered = useMemo(
    () => (type === "TOUS" ? rows : rows.filter((r) => r.type === type)),
    [rows, type],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={selectCx}
          aria-label="Filtrer par type de veille"
        >
          <option value="TOUS">Tous les types</option>
          {Object.entries(VEILLE_TYPES).map(([v, t]) => (
            <option key={v} value={v}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border [&_[data-slot=table-container]]:max-h-[65vh] [&_[data-slot=table-container]]:overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={headCx}>Type</TableHead>
              <TableHead className={headCx}>Sujet</TableHead>
              <TableHead className={cn(headCx, "hidden md:table-cell")}>Source</TableHead>
              <TableHead className={cn(headCx, "hidden lg:table-cell")}>Date</TableHead>
              <TableHead className={cn(headCx, "hidden xl:table-cell")}>Action</TableHead>
              <TableHead className={cn(headCx, "text-right")}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  {rows.length === 0
                    ? "Aucune entrée. Conseil : ajoutez au moins une entrée datée par trimestre et par type de veille."
                    : "Aucune entrée ne correspond à ce filtre."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((e) => {
                const t = VEILLE_TYPES[e.type];
                return (
                  <TableRow key={e.id} className="align-top hover:bg-muted/40">
                    <TableCell>
                      <Badge variant="secondary" className={t?.cls}>
                        {t?.label ?? e.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-normal">
                      <div className="font-medium">{e.sujet}</div>
                      {e.resume && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {e.resume}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {e.source}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {new Date(e.date).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="hidden max-w-xs whitespace-normal text-sm text-muted-foreground xl:table-cell">
                      {e.action ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {e.lien && (
                          <a
                            href={e.lien}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" /> Source
                          </a>
                        )}
                        <form action={supprimerVeille}>
                          <input type="hidden" name="id" value={e.id} />
                          <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                            Supprimer
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} entrée{filtered.length > 1 ? "s" : ""}
        {filtered.length !== rows.length ? ` sur ${rows.length}` : ""}
      </p>
    </div>
  );
}
