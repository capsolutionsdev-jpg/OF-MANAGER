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
import { STATUT_LABELS } from "@/lib/validators/candidat";
import { StatutSelect } from "@/components/crm/statut-select";
import { SendProspectLinkButton } from "@/components/crm/send-prospect-link-button";
import {
  QuickEnrollModal,
  type SessionOption,
} from "@/components/inscriptions/quick-enroll-modal";
import { cn } from "@/lib/utils";

type Statut = keyof typeof STATUT_LABELS;

/** Ligne prospect aplatie en données sérialisables (pas de Date/objets). */
export type CrmRow = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  ville: string;
  financementLabel: string | null;
  statut: Statut;
  formationTitre: string;
  formationId: string | null;
  inscriptionsCount: number;
  prospectSigned: boolean;
  prospectSent: boolean;
  enRetard: boolean;
};

const STATUT_BADGE: Record<string, string> = {
  NOUVEAU: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  EN_TRAITEMENT: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  INSCRIT: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  REFUSE: "bg-red-500/10 text-red-700 dark:text-red-300",
  ARCHIVE: "bg-muted text-muted-foreground",
};

type SortKey = "nom" | "formation" | "statut";
const TEXT_KEYS: SortKey[] = ["nom", "formation"];
const PAGE_SIZE = 20;
const selectCx =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";
const headCx = "sticky top-0 z-10 bg-background";

export function CrmTable({
  rows,
  sessionOptions,
}: {
  rows: CrmRow[];
  sessionOptions: SessionOption[];
}) {
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState<Statut | "">("");
  const [formation, setFormation] = useState("");
  const [retard, setRetard] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "nom",
    dir: "asc",
  });
  const [page, setPage] = useState(0);

  const statuts = useMemo(
    () => [...new Set(rows.map((r) => r.statut))],
    [rows],
  );
  const formations = useMemo(
    () =>
      [
        ...new Map(
          rows.filter((r) => r.formationId).map((r) => [r.formationId!, r.formationTitre]),
        ).entries(),
      ].sort((a, b) => a[1].localeCompare(b[1], "fr")),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (needle && !`${r.prenom} ${r.nom} ${r.email}`.toLowerCase().includes(needle))
        return false;
      if (statut && r.statut !== statut) return false;
      if (formation && (r.formationId ?? "__none__") !== formation) return false;
      if (retard && !r.enRetard) return false;
      return true;
    });
  }, [rows, q, statut, formation, retard]);

  const sorted = useMemo(() => {
    const { key, dir } = sort;
    const mul = dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let cmp: number;
      if (key === "nom")
        cmp = `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr");
      else if (key === "formation")
        cmp = a.formationTitre.localeCompare(b.formationTitre, "fr");
      else cmp = a.statut.localeCompare(b.statut);
      if (cmp === 0) cmp = a.nom.localeCompare(b.nom, "fr");
      return cmp * mul;
    });
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const reset = () => setPage(0);
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
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              reset();
            }}
            placeholder="Rechercher un prospect (nom, email)…"
            className="h-8 pl-8"
            aria-label="Rechercher un prospect"
          />
        </div>
        <select
          value={statut}
          onChange={(e) => {
            setStatut(e.target.value as Statut | "");
            reset();
          }}
          className={selectCx}
          aria-label="Filtrer par état"
        >
          <option value="">Tous les états</option>
          {statuts.map((s) => (
            <option key={s} value={s}>
              {STATUT_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={formation}
          onChange={(e) => {
            setFormation(e.target.value);
            reset();
          }}
          className={selectCx}
          aria-label="Filtrer par formation souhaitée"
        >
          <option value="">Toutes les formations</option>
          {formations.map(([id, titre]) => (
            <option key={id} value={id}>
              {titre}
            </option>
          ))}
          <option value="__none__">Sans formation précisée</option>
        </select>
        <Button
          variant={retard ? "default" : "outline"}
          size="sm"
          className="h-8"
          onClick={() => {
            setRetard((v) => !v);
            reset();
          }}
          aria-pressed={retard}
        >
          Relances en retard
        </Button>
      </div>

      {/* Table (en-têtes collants + défilement interne) */}
      <div className="rounded-lg border [&_[data-slot=table-container]]:max-h-[70vh] [&_[data-slot=table-container]]:overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead label="Candidat" sortKey="nom" sort={sort} onToggle={toggleSort} />
              <SortHead
                label="Formation souhaitée"
                sortKey="formation"
                sort={sort}
                onToggle={toggleSort}
                className="hidden md:table-cell"
              />
              <TableHead className={cn(headCx, "hidden lg:table-cell")}>Téléphone</TableHead>
              <TableHead className={cn(headCx, "hidden lg:table-cell")}>Ville</TableHead>
              <TableHead className={headCx}>Financement</TableHead>
              <SortHead label="État" sortKey="statut" sort={sort} onToggle={toggleSort} />
              <TableHead className={cn(headCx, "text-right")}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Aucun prospect ne correspond à ces filtres.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/40">
                  <TableCell className="font-medium">
                    <Link href={`/candidats/${c.id}`} className="hover:underline">
                      {c.prenom} {c.nom}
                    </Link>
                    {c.inscriptionsCount > 0 && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        ({c.inscriptionsCount} insc.)
                      </span>
                    )}
                    <div className="text-xs text-muted-foreground md:hidden">{c.email}</div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {c.formationTitre}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {c.telephone || "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {c.ville || "—"}
                  </TableCell>
                  <TableCell>
                    {c.financementLabel ? (
                      <Badge variant="outline" className="text-xs">
                        {c.financementLabel}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-xs", STATUT_BADGE[c.statut])}>
                      {STATUT_LABELS[c.statut]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {c.prospectSigned ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          fiche signée
                        </Badge>
                      ) : c.prospectSent ? (
                        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          lien envoyé
                        </Badge>
                      ) : null}
                      {c.statut !== "INSCRIT" && (
                        <SendProspectLinkButton candidatId={c.id} sent={c.prospectSent} />
                      )}
                      <StatutSelect id={c.id} statut={c.statut} />
                      {c.statut !== "INSCRIT" && (
                        <QuickEnrollModal
                          candidatId={c.id}
                          candidatName={`${c.prenom} ${c.nom}`}
                          sessions={sessionOptions}
                          formationId={c.formationId ?? undefined}
                        />
                      )}
                    </div>
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
          {sorted.length} prospect{sorted.length > 1 ? "s" : ""}
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
        )}
      >
        {label}
        <Icon className="h-3.5 w-3.5 shrink-0" />
      </button>
    </TableHead>
  );
}
