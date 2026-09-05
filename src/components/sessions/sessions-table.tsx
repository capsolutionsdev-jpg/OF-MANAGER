"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  PlayCircle,
  CheckCircle2,
  Archive,
  PackageOpen,
  type LucideIcon,
} from "lucide-react";
import type { Modalite, SessionStatut } from "@prisma/client";
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
import { MODALITE_LABELS } from "@/lib/validators/formation";
import { SESSION_STATUT_LABELS } from "@/lib/validators/session";
import { cn } from "@/lib/utils";

export type SessionEtat = "AVENIR" | "ENCOURS" | "PASSEE" | "ARCHIVEE";

/** Une session aplatie en données sérialisables (pas de Date/objets). */
export type SessionRow = {
  id: string;
  formationTitre: string;
  academyKey: string; // "DIGITAL" | "SAFETY" | ... | "AUTRE"
  academyLabel: string;
  dateDebut: string; // ISO
  dateFin: string; // ISO
  formateurs: string; // noms joints, "" si aucun
  lieu: string | null;
  modalite: Modalite;
  nbPlaces: number;
  inscriptions: number;
  statut: SessionStatut;
  etat: SessionEtat;
};

type SortKey = "formation" | "academy" | "dateDebut" | "places" | "statut";
const TEXT_KEYS: SortKey[] = ["formation", "academy", "statut"];

const ETATS: { key: SessionEtat; label: string; icon: LucideIcon }[] = [
  { key: "AVENIR", label: "À venir", icon: Clock },
  { key: "ENCOURS", label: "En cours", icon: PlayCircle },
  { key: "PASSEE", label: "Passées", icon: CheckCircle2 },
  { key: "ARCHIVEE", label: "Archivées", icon: Archive },
];

const ACADEMY_RANK: Record<string, number> = {
  DIGITAL: 0,
  SAFETY: 1,
  TRANSPORT: 2,
  LANGUE: 3,
  AUTRE: 9,
};

const PAGE_SIZE = 20;

const selectCx =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";
const headCx = "sticky top-0 z-10 bg-background";

export function SessionsTable({ rows }: { rows: SessionRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [etat, setEtat] = useState<SessionEtat>(() => {
    const u = searchParams.get("etat") as SessionEtat | null;
    if (u && ETATS.some((e) => e.key === u)) return u;
    for (const e of ETATS) if (rows.some((r) => r.etat === e.key)) return e.key;
    return "AVENIR";
  });
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");
  const [academy, setAcademy] = useState(() => searchParams.get("academy") ?? "");
  const [statut, setStatut] = useState<SessionStatut | "">(
    () => (searchParams.get("statut") as SessionStatut) ?? "",
  );
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>(() => {
    const raw = searchParams.get("sort");
    if (raw) {
      const [key, dir] = raw.split(".");
      if (key) return { key: key as SortKey, dir: dir === "desc" ? "desc" : "asc" };
    }
    return { key: "dateDebut", dir: "asc" };
  });
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 0);

  // Persistance des filtres dans l'URL : le retour navigateur et le partage de
  // lien retrouvent l'état exact de la liste (A10-005).
  useEffect(() => {
    const p = new URLSearchParams();
    if (etat) p.set("etat", etat);
    if (q.trim()) p.set("q", q.trim());
    if (academy) p.set("academy", academy);
    if (statut) p.set("statut", statut);
    if (sort.key !== "dateDebut" || sort.dir !== "asc") p.set("sort", `${sort.key}.${sort.dir}`);
    if (page > 0) p.set("page", String(page));
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [etat, q, academy, statut, sort, page, pathname, router]);

  // Académies réellement présentes (pour le filtre), ordonnées par domaine.
  const academies = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.academyKey, r.academyLabel);
    return [...map.entries()]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => (ACADEMY_RANK[a.key] ?? 5) - (ACADEMY_RANK[b.key] ?? 5));
  }, [rows]);

  // Statuts réellement présents (pour le filtre).
  const statuts = useMemo(
    () => [...new Set(rows.map((r) => r.statut))],
    [rows],
  );

  // Filtres transverses (hors onglet d'état) : servent aussi aux compteurs d'onglets.
  const matched = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (
        needle &&
        !`${r.formationTitre} ${r.lieu ?? ""} ${r.formateurs}`
          .toLowerCase()
          .includes(needle)
      )
        return false;
      if (academy && r.academyKey !== academy) return false;
      if (statut && r.statut !== statut) return false;
      return true;
    });
  }, [rows, q, academy, statut]);

  const countByEtat = useMemo(() => {
    const c: Record<SessionEtat, number> = {
      AVENIR: 0,
      ENCOURS: 0,
      PASSEE: 0,
      ARCHIVEE: 0,
    };
    for (const r of matched) c[r.etat] += 1;
    return c;
  }, [matched]);

  const sorted = useMemo(() => {
    const { key, dir } = sort;
    const mul = dir === "asc" ? 1 : -1;
    const inEtat = matched.filter((r) => r.etat === etat);
    return inEtat.sort((a, b) => {
      let cmp: number;
      if (key === "formation") cmp = a.formationTitre.localeCompare(b.formationTitre, "fr");
      else if (key === "academy") cmp = a.academyLabel.localeCompare(b.academyLabel, "fr");
      else if (key === "statut")
        cmp = SESSION_STATUT_LABELS[a.statut].localeCompare(SESSION_STATUT_LABELS[b.statut], "fr");
      else if (key === "dateDebut") cmp = a.dateDebut.localeCompare(b.dateDebut);
      else cmp = a.inscriptions / Math.max(1, a.nbPlaces) - b.inscriptions / Math.max(1, b.nbPlaces);
      if (cmp === 0) cmp = a.dateDebut.localeCompare(b.dateDebut);
      return cmp * mul;
    });
  }, [matched, etat, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  function reset() {
    setPage(0);
  }
  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: TEXT_KEYS.includes(key) ? "asc" : "desc" },
    );
    reset();
  }

  const fmt = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

  return (
    <div className="space-y-3">
      {/* Filtres + onglets d'état, regroupés dans une carte */}
      <div className="rounded-2xl border border-primary/20 bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                reset();
              }}
              placeholder="Rechercher une formation, un lieu, un formateur…"
              className="h-9 pl-8"
              aria-label="Rechercher une session"
            />
          </div>
          <select
            value={academy}
            onChange={(e) => {
              setAcademy(e.target.value);
              reset();
            }}
            className={selectCx}
            aria-label="Filtrer par domaine"
          >
            <option value="">Tous les domaines</option>
            {academies.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </select>
          <select
            value={statut}
            onChange={(e) => {
              setStatut(e.target.value as SessionStatut | "");
              reset();
            }}
            className={selectCx}
            aria-label="Filtrer par statut"
          >
            <option value="">Tous les statuts</option>
            {statuts.map((s) => (
              <option key={s} value={s}>
                {SESSION_STATUT_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Onglets d'état — segments avec icône + compteur */}
        <div className="mt-3 flex flex-wrap gap-2">
          {ETATS.map((e) => {
            const active = etat === e.key;
            const Icon = e.icon;
            return (
              <button
                key={e.key}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setEtat(e.key);
                  reset();
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {e.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[0.7rem] font-semibold tabular-nums",
                    active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {countByEtat[e.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table dense (en-têtes collants + défilement vertical interne) */}
      <div className="rounded-2xl border bg-card shadow-sm [&_[data-slot=table-container]]:max-h-[70vh] [&_[data-slot=table-container]]:overflow-auto">
        <Table className="stagger-rows">
          <TableHeader>
            <TableRow>
              <SortHead label="Formation" sortKey="formation" sort={sort} onToggle={toggleSort} />
              <SortHead label="Domaine" sortKey="academy" sort={sort} onToggle={toggleSort} className="hidden sm:table-cell" />
              <SortHead label="Dates" sortKey="dateDebut" sort={sort} onToggle={toggleSort} />
              <TableHead className={cn(headCx, "hidden md:table-cell")}>Formateur(s)</TableHead>
              <TableHead className={cn(headCx, "hidden lg:table-cell")}>Lieu</TableHead>
              <TableHead className={headCx}>Modalité</TableHead>
              <SortHead label="Places" sortKey="places" sort={sort} onToggle={toggleSort} className="w-36" />
              <SortHead label="Statut" sortKey="statut" sort={sort} onToggle={toggleSort} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="py-16">
                  <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <PackageOpen className="h-8 w-8" />
                    </span>
                    <p className="mt-4 font-semibold text-foreground">
                      Aucune session ne correspond à ces filtres.
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Essayez de modifier vos filtres ou recherchez autrement.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((s) => {
                const pct = s.nbPlaces > 0 ? Math.round((s.inscriptions / s.nbPlaces) * 100) : 0;
                const barColor = pct >= 100 ? "bg-success" : pct >= 60 ? "bg-info" : "bg-warning";
                return (
                  <TableRow key={s.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">
                      <Link href={`/sessions/${s.id}`} className="hover:underline">
                        {s.formationTitre}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {s.academyLabel}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {fmt(s.dateDebut)} → {fmt(s.dateFin)}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {s.formateurs || "—"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {s.lieu ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{MODALITE_LABELS[s.modalite]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {s.inscriptions}/{s.nbPlaces}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{SESSION_STATUT_LABELS[s.statut]}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          {sorted.length} session{sorted.length > 1 ? "s" : ""} dans cet onglet
        </span>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={current <= 0} onClick={() => setPage(current - 1)}>
              <ChevronLeft className="h-4 w-4" /> Précédent
            </Button>
            <span className="text-muted-foreground">
              Page {current + 1} / {pageCount}
            </span>
            <Button variant="outline" size="sm" disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)}>
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
        )}
      >
        {label}
        <Icon className="h-3.5 w-3.5 shrink-0" />
      </button>
    </TableHead>
  );
}
