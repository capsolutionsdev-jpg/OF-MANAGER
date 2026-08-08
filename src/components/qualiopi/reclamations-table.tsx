"use client";

import { useMemo, useState } from "react";
import { Search, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  avancerReclamation,
  supprimerReclamation,
} from "@/lib/actions/registre-actions";
import { ORIGINES } from "@/components/qualiopi/new-reclamation-dialog";

/** Réclamation sérialisée (dates en ISO, retards pré-calculés côté serveur). */
export type ReclamationRow = {
  id: string;
  statut: string;
  origine: string;
  declarant: string;
  contact: string | null;
  formation: string | null;
  objet: string;
  description: string;
  gravite: number;
  date: string; // ISO
  arDate: string | null;
  reponseDate: string | null;
  clotureDate: string | null;
  retardAr: boolean;
  retardReponse: boolean;
};

const STATUTS: Record<string, { label: string; cls: string }> = {
  NOUVELLE: { label: "Nouvelle", cls: "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300" },
  ACCUSE_RECEPTION: { label: "AR envoyé", cls: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  EN_TRAITEMENT: { label: "En traitement", cls: "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  CLOTUREE: { label: "Clôturée", cls: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
};

const GRAVITES = ["", "Mineure", "Modérée", "Majeure"];

const STATUT_FILTERS: { value: string; label: string }[] = [
  { value: "TOUS", label: "Tous les statuts" },
  { value: "NOUVELLE", label: "Nouvelle" },
  { value: "ACCUSE_RECEPTION", label: "AR envoyé" },
  { value: "EN_TRAITEMENT", label: "En traitement" },
  { value: "CLOTUREE", label: "Clôturée" },
];

const RETARD_FILTERS: { value: string; label: string }[] = [
  { value: "TOUS", label: "Tous les délais" },
  { value: "EN_RETARD", label: "En retard" },
  { value: "RETARD_AR", label: "Retard accusé de réception" },
  { value: "RETARD_REPONSE", label: "Retard réponse" },
  { value: "A_JOUR", label: "Dans les délais" },
];

const selectCx =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";
const headCx = "sticky top-0 z-10 bg-background";

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR") : "—";

/** Registre des réclamations : table filtrable (statut + retard) avec en-têtes
 * collants. Les actions (traitement, clôture, suppression) restent des server
 * actions. */
export function ReclamationsTable({ rows }: { rows: ReclamationRow[] }) {
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState("TOUS");
  const [retard, setRetard] = useState("TOUS");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (
        needle &&
        !`${r.objet} ${r.declarant} ${r.contact ?? ""} ${r.formation ?? ""} ${r.description}`
          .toLowerCase()
          .includes(needle)
      )
        return false;
      if (statut !== "TOUS" && r.statut !== statut) return false;
      if (retard === "EN_RETARD" && !r.retardAr && !r.retardReponse) return false;
      if (retard === "RETARD_AR" && !r.retardAr) return false;
      if (retard === "RETARD_REPONSE" && !r.retardReponse) return false;
      if (retard === "A_JOUR" && (r.retardAr || r.retardReponse)) return false;
      return true;
    });
  }, [rows, q, statut, retard]);

  return (
    <div className="space-y-3">
      {/* Barre de filtres */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un objet, un réclamant, une formation…"
            className="h-8 pl-8"
            aria-label="Rechercher une réclamation"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <select
            value={retard}
            onChange={(e) => setRetard(e.target.value)}
            className={selectCx}
            aria-label="Filtrer par délai"
          >
            {RETARD_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table (en-têtes collants + défilement interne) */}
      <div className="rounded-lg border [&_[data-slot=table-container]]:max-h-[65vh] [&_[data-slot=table-container]]:overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={headCx}>Objet</TableHead>
              <TableHead className={cn(headCx, "hidden md:table-cell")}>Réclamant</TableHead>
              <TableHead className={cn(headCx, "hidden lg:table-cell")}>Origine · gravité</TableHead>
              <TableHead className={cn(headCx, "hidden lg:table-cell")}>Reçue</TableHead>
              <TableHead className={headCx}>Statut</TableHead>
              <TableHead className={cn(headCx, "hidden xl:table-cell")}>Suivi</TableHead>
              <TableHead className={cn(headCx, "text-right")}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  {rows.length === 0
                    ? "Aucune réclamation enregistrée. Un registre vide reste une preuve : il montre que le dispositif existe."
                    : "Aucune réclamation ne correspond à ces filtres."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const st = STATUTS[r.statut];
                return (
                  <TableRow key={r.id} className="align-top hover:bg-muted/40">
                    <TableCell className="max-w-xs whitespace-normal">
                      <div className="font-medium">{r.objet}</div>
                      {r.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {r.description}
                        </p>
                      )}
                      {(r.retardAr || r.retardReponse) && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {r.retardAr
                            ? "AR en retard (objectif : 5 j ouvrés)"
                            : "Réponse en retard (objectif : 15 j ouvrés)"}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="hidden whitespace-normal text-sm text-muted-foreground md:table-cell">
                      {r.declarant}
                      {r.contact ? <div className="text-xs">{r.contact}</div> : null}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {ORIGINES[r.origine] ?? r.origine}
                      <div className="text-xs">gravité {GRAVITES[r.gravite] ?? r.gravite}</div>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {fmt(r.date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={st?.cls}>
                        {st?.label ?? r.statut}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                      <div>AR : {fmt(r.arDate)}</div>
                      <div>Réponse : {fmt(r.reponseDate)}</div>
                      <div>Clôture : {fmt(r.clotureDate)}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {r.statut === "NOUVELLE" && (
                          <form action={avancerReclamation}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="statut" value="ACCUSE_RECEPTION" />
                            <Button type="submit" size="sm" variant="outline">
                              AR envoyé
                            </Button>
                          </form>
                        )}
                        {(r.statut === "NOUVELLE" || r.statut === "ACCUSE_RECEPTION") && (
                          <form action={avancerReclamation}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="statut" value="EN_TRAITEMENT" />
                            <Button type="submit" size="sm" variant="outline">
                              En traitement
                            </Button>
                          </form>
                        )}
                        {r.statut !== "CLOTUREE" && (
                          <form action={avancerReclamation}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="statut" value="CLOTUREE" />
                            <Button type="submit" size="sm">
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Clôturer
                            </Button>
                          </form>
                        )}
                        <form action={supprimerReclamation}>
                          <input type="hidden" name="id" value={r.id} />
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
        {filtered.length} réclamation{filtered.length > 1 ? "s" : ""}
        {filtered.length !== rows.length ? ` sur ${rows.length}` : ""}
      </p>
    </div>
  );
}
