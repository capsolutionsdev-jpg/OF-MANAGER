"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
import { RecordPaymentDialog } from "@/components/comptabilite/record-payment-dialog";
import { euro, ETATS, type Etat } from "@/lib/comptabilite/format";
import { cn } from "@/lib/utils";

/** Une ligne de dossier, aplatie en données sérialisables (pas de Date/objets). */
export type DossierRow = {
  id: string;
  candidatId: string;
  nom: string;
  email: string;
  formation: string;
  dateDebut: string; // ISO
  mode: string;
  du: number;
  paye: number;
  restant: number;
  etat: Etat;
};

type SortKey = "nom" | "formation" | "dateDebut" | "du" | "paye" | "restant" | "etat";
type EtatFilter = "TOUS" | "NON_SOLDE" | Etat;

const ETAT_FILTERS: { value: EtatFilter; label: string }[] = [
  { value: "TOUS", label: "Tous les états" },
  { value: "NON_SOLDE", label: "Non soldés (impayé + partiel)" },
  { value: "IMPAYE", label: "Impayé" },
  { value: "PARTIEL", label: "Partiel" },
  { value: "PAYE", label: "Payé" },
  { value: "A_CHIFFRER", label: "À chiffrer" },
];

const PAGE_SIZE = 20;
const TEXT_KEYS: SortKey[] = ["nom", "formation", "dateDebut"];

const selectCx =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";
const headCx = "sticky top-0 z-10 bg-background";

export function DossiersTable({ rows }: { rows: DossierRow[] }) {
  const [q, setQ] = useState("");
  const [etat, setEtat] = useState<EtatFilter>("TOUS");
  const [mode, setMode] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "restant",
    dir: "desc",
  });
  const [page, setPage] = useState(0);

  // Modes réellement présents dans les données (pour le filtre).
  const modes = useMemo(
    () => [...new Set(rows.map((r) => r.mode))].sort((a, b) => a.localeCompare(b, "fr")),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (needle && !`${r.nom} ${r.email} ${r.formation}`.toLowerCase().includes(needle))
        return false;
      if (etat === "NON_SOLDE") {
        if (r.etat !== "IMPAYE" && r.etat !== "PARTIEL") return false;
      } else if (etat !== "TOUS" && r.etat !== etat) {
        return false;
      }
      if (mode && r.mode !== mode) return false;
      return true;
    });
  }, [rows, q, etat, mode]);

  const sorted = useMemo(() => {
    const { key, dir } = sort;
    const mul = dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let cmp: number;
      if (TEXT_KEYS.includes(key)) {
        cmp = String(a[key]).localeCompare(String(b[key]), "fr");
      } else if (key === "etat") {
        cmp = a.etat.localeCompare(b.etat);
      } else {
        cmp = (a[key] as number) - (b[key] as number);
      }
      if (cmp === 0) cmp = a.nom.localeCompare(b.nom, "fr");
      return cmp * mul;
    });
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  function reset() {
    setPage(0);
  }
  function onSearch(v: string) {
    setQ(v);
    reset();
  }
  function onEtat(v: EtatFilter) {
    setEtat(v);
    reset();
  }
  function onMode(v: string) {
    setMode(v);
    reset();
  }
  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: TEXT_KEYS.includes(key) ? "asc" : "desc" },
    );
    reset();
  }

  return (
    <div className="space-y-3">
      {/* Barre de filtres */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Rechercher un candidat, un email, une formation…"
            className="h-8 pl-8"
            aria-label="Rechercher un dossier"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={etat}
            onChange={(e) => onEtat(e.target.value as EtatFilter)}
            className={selectCx}
            aria-label="Filtrer par état"
          >
            {ETAT_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <select
            value={mode}
            onChange={(e) => onMode(e.target.value)}
            className={selectCx}
            aria-label="Filtrer par mode de financement"
          >
            <option value="">Tous les modes</option>
            {modes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table (en-têtes collants + défilement vertical interne) */}
      <div className="rounded-lg border [&_[data-slot=table-container]]:max-h-[70vh] [&_[data-slot=table-container]]:overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead label="Candidat" sortKey="nom" sort={sort} onToggle={toggleSort} />
              <SortHead label="Formation" sortKey="formation" sort={sort} onToggle={toggleSort} className="hidden md:table-cell" />
              <SortHead label="Démarrage" sortKey="dateDebut" sort={sort} onToggle={toggleSort} className="hidden lg:table-cell" />
              <TableHead className={headCx}>Mode</TableHead>
              <SortHead label="Dû" sortKey="du" sort={sort} onToggle={toggleSort} className="text-right" />
              <SortHead label="Payé" sortKey="paye" sort={sort} onToggle={toggleSort} className="text-right" />
              <SortHead label="Restant" sortKey="restant" sort={sort} onToggle={toggleSort} className="text-right" />
              <SortHead label="État" sortKey="etat" sort={sort} onToggle={toggleSort} />
              <TableHead className={cn(headCx, "text-right")}>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  Aucun dossier ne correspond à ces filtres.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((l) => (
                <TableRow key={l.id} className="hover:bg-muted/40">
                  <TableCell className="font-medium">
                    <Link href={`/candidats/${l.candidatId}`} className="hover:underline">
                      {l.nom}
                    </Link>
                    <div className="text-xs text-muted-foreground">{l.email}</div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {l.formation}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {new Date(l.dateDebut).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{l.mode}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{l.du > 0 ? euro(l.du) : "—"}</TableCell>
                  <TableCell className="text-right text-success">
                    {l.paye > 0 ? euro(l.paye) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {l.restant > 0 ? euro(l.restant) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={ETATS[l.etat].cls}>{ETATS[l.etat].label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <RecordPaymentDialog
                      inscriptionId={l.id}
                      candidatNom={l.nom}
                      formation={l.formation}
                      restant={l.restant}
                      defaultMode={l.mode}
                      triggerVariant="ghost"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          {sorted.length} dossier{sorted.length > 1 ? "s" : ""}
          {sorted.length !== rows.length ? ` sur ${rows.length}` : ""}
        </span>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={current <= 0}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> Précédent
            </Button>
            <span className="text-muted-foreground">
              Page {current + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={current >= pageCount - 1}
              onClick={() => setPage(current + 1)}
            >
              Suivant <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** En-tête de colonne triable (flèche selon le sens de tri). */
function SortHead({
  label,
  sortKey,
  sort,
  onToggle,
  className,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onToggle: (key: SortKey) => void;
  className?: string;
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={cn(headCx, className)}>
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        className={cn(
          "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
          className?.includes("text-right") && "flex-row-reverse",
        )}
      >
        {label}
        <Icon className="h-3.5 w-3.5 shrink-0" />
      </button>
    </TableHead>
  );
}
