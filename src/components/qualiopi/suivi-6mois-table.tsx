"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Send, Bell, Download, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TONE_CLASSES } from "@/components/ui/status-badge";
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
import { SUIVI_6MOIS_STATUT_LABELS, type Suivi6MoisStatut } from "@/lib/suivi6mois";
import type { Suivi6MoisRow } from "@/lib/suivi6mois-listing";
import {
  envoyerSuivi6Mois,
  relancerSuivi6Mois,
  envoyerSuivi6MoisBatch,
} from "@/lib/actions/parcours-actions";

const STATUT_TONE: Record<Suivi6MoisStatut, string> = {
  A_VENIR: TONE_CLASSES.info,
  NON_ENVOYE: TONE_CLASSES.danger,
  EN_ATTENTE: TONE_CLASSES.warning,
  FAIT: TONE_CLASSES.success,
};

const STATUT_FILTERS: { value: string; label: string }[] = [
  { value: "TOUS", label: "Tous les statuts" },
  { value: "A_VENIR", label: SUIVI_6MOIS_STATUT_LABELS.A_VENIR },
  { value: "NON_ENVOYE", label: SUIVI_6MOIS_STATUT_LABELS.NON_ENVOYE },
  { value: "EN_ATTENTE", label: SUIVI_6MOIS_STATUT_LABELS.EN_ATTENTE },
  { value: "FAIT", label: SUIVI_6MOIS_STATUT_LABELS.FAIT },
];

const selectCx =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";
const headCx = "sticky top-0 z-10 bg-background";

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

export function Suivi6MoisTable({ rows }: { rows: Suivi6MoisRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState("TOUS");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (
        needle &&
        !`${r.candidat} ${r.email} ${r.formation}`.toLowerCase().includes(needle)
      )
        return false;
      if (statut !== "TOUS" && r.statut !== statut) return false;
      return true;
    });
  }, [rows, q, statut]);

  // Seules les inscriptions « non envoyé » sont sélectionnables pour l'envoi en lot.
  const selectables = useMemo(
    () => filtered.filter((r) => r.statut === "NON_ENVOYE").map((r) => r.id),
    [filtered],
  );
  const allSelected = selectables.length > 0 && selectables.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => {
      if (selectables.every((id) => prev.has(id))) return new Set();
      return new Set(selectables);
    });
  }

  function runAction(fn: () => Promise<{ ok: boolean; error?: string; demo?: boolean }>, okMsg: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.demo ? `${okMsg} (mode démo : e-mail non configuré)` : okMsg);
      else toast.error(res.error ?? "Erreur.");
      router.refresh();
    });
  }

  function envoyerLot() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!window.confirm(`Envoyer l'enquête de suivi à 6 mois à ${ids.length} candidat(s) ?`)) return;
    startTransition(async () => {
      const res = await envoyerSuivi6MoisBatch(ids);
      if (res.ok) toast.success(`${res.envoyes} envoyée(s)${res.echecs ? `, ${res.echecs} échec(s)` : ""}${res.ignores ? `, ${res.ignores} ignorée(s) (limite 500 — relancez pour le reste)` : ""}.`);
      else toast.error(res.error ?? "Erreur.");
      setSelected(new Set());
      router.refresh();
    });
  }

  const nbSelected = [...selected].filter((id) => selectables.includes(id)).length;

  return (
    <div className="space-y-3">
      {/* Barre de filtres + action de lot */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un stagiaire, une formation…"
            className="h-8 pl-8"
            aria-label="Rechercher une enquête"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {nbSelected > 0 && (
            <Button size="sm" onClick={envoyerLot} disabled={isPending}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Envoyer aux {nbSelected} sélectionné{nbSelected > 1 ? "s" : ""}
            </Button>
          )}
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
      </div>

      <div className="rounded-lg border [&_[data-slot=table-container]]:max-h-[65vh] [&_[data-slot=table-container]]:overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(headCx, "w-8")}>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={selectables.length === 0}
                  aria-label="Tout sélectionner"
                />
              </TableHead>
              <TableHead className={headCx}>Stagiaire</TableHead>
              <TableHead className={cn(headCx, "hidden md:table-cell")}>Formation</TableHead>
              <TableHead className={cn(headCx, "hidden lg:table-cell")}>Fin</TableHead>
              <TableHead className={headCx}>Échéance J+6</TableHead>
              <TableHead className={headCx}>Statut</TableHead>
              <TableHead className={cn(headCx, "hidden xl:table-cell")}>Suivi</TableHead>
              <TableHead className={cn(headCx, "text-right")}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  {rows.length === 0
                    ? "Aucune inscription à suivre pour le moment."
                    : "Aucune enquête ne correspond à ces filtres."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id} className="align-top hover:bg-muted/40">
                  <TableCell>
                    {r.statut === "NON_ENVOYE" ? (
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                        aria-label={`Sélectionner ${r.candidat}`}
                      />
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="font-medium">{r.candidat}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                    <div className="text-xs text-muted-foreground md:hidden">{r.formation}</div>
                  </TableCell>
                  <TableCell className="hidden whitespace-normal text-sm text-muted-foreground md:table-cell">
                    {r.formation}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {fmt(r.dateFin)}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                      {fmt(r.echeance)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={STATUT_TONE[r.statut]}>
                      {SUIVI_6MOIS_STATUT_LABELS[r.statut]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                    <div>Envoyé : {fmt(r.envoyeLe)}</div>
                    {r.relanceCount > 0 && (
                      <div>
                        Relancé : {fmt(r.relanceLe)} ({r.relanceCount})
                      </div>
                    )}
                    {r.statut === "FAIT" && (
                      <div>Réponse : {fmt(r.reponduLe)} — {r.situation || "—"}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {r.statut === "NON_ENVOYE" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => runAction(() => envoyerSuivi6Mois(r.id), "Enquête envoyée.")}
                        >
                          <Send className="mr-1 h-3.5 w-3.5" /> Envoyer
                        </Button>
                      )}
                      {r.statut === "EN_ATTENTE" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => runAction(() => relancerSuivi6Mois(r.id), "Relance envoyée.")}
                        >
                          <Bell className="mr-1 h-3.5 w-3.5" /> Relancer
                        </Button>
                      )}
                      {r.statut === "FAIT" && r.token && (
                        <Button size="sm" render={<a href={`/suivi/${r.token}/document`} target="_blank" rel="noopener" />}>
                          <Download className="mr-1 h-3.5 w-3.5" /> Télécharger
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} enquête{filtered.length > 1 ? "s" : ""}
        {filtered.length !== rows.length ? ` sur ${rows.length}` : ""}
      </p>
    </div>
  );
}
