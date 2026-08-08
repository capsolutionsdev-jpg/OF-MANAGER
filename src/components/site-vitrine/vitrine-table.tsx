"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  ExternalLink,
  Rocket,
  EyeOff,
  PauseCircle,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VITRINE_STATUT_LABELS, FORMULE_DEFS } from "@/lib/validators/formation";
import { saveVitrineRowAction } from "@/lib/actions/vitrine-actions";
import { cn } from "@/lib/utils";

// Valeurs des formules (heures + prix) éditées dans le dialogue de la ligne.
type Formules = {
  presentielHeures: string;
  presentielPrix: string;
  mixteHeures: string;
  mixtePrix: string;
  elearningHeures: string;
  elearningPrix: string;
};

/** Une fiche du site vitrine, aplatie en données sérialisables. */
export type VitrineRow = {
  id: string;
  titre: string;
  reference: string;
  editUrl: string;
  academy: string | null;
  academyLabel: string;
  vitrineStatut: "PUBLIEE" | "MASQUEE" | "SUSPENDUE";
  tarif: string;
  duree: string;
  dureeHeures: string;
  ficheUrl: string | null;
  formules: Formules;
};

type StatutFilter = "TOUS" | VitrineRow["vitrineStatut"];
type BadgeVariant = "default" | "secondary" | "destructive";

const STATUT_META: Record<
  VitrineRow["vitrineStatut"],
  { label: string; badge: BadgeVariant }
> = {
  PUBLIEE: { label: "En ligne", badge: "default" },
  MASQUEE: { label: "Brouillon", badge: "secondary" },
  SUSPENDUE: { label: "Suspendue", badge: "destructive" },
};

const ORDRE: Record<string, number> = { PUBLIEE: 0, MASQUEE: 1, SUSPENDUE: 2 };

// Gabarit de colonnes partagé par l'en-tête et les lignes (aligne le tout).
const COLS =
  "lg:grid-cols-[minmax(0,1fr)_11rem_6.5rem_7.5rem_auto]";

const selectCx =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

const EMPTY_FORMULES: Formules = {
  presentielHeures: "",
  presentielPrix: "",
  mixteHeures: "",
  mixtePrix: "",
  elearningHeures: "",
  elearningPrix: "",
};

export function VitrineTable({
  rows,
  counts,
}: {
  rows: VitrineRow[];
  counts: { PUBLIEE: number; MASQUEE: number; SUSPENDUE: number };
}) {
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState<StatutFilter>("TOUS");
  const [academy, setAcademy] = useState("");

  // Académies réellement présentes (pour le filtre catégorie).
  const academies = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) if (r.academy) m.set(r.academy, r.academyLabel);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (needle && !`${r.titre} ${r.reference}`.toLowerCase().includes(needle))
          return false;
        if (statut !== "TOUS" && r.vitrineStatut !== statut) return false;
        if (academy && r.academy !== academy) return false;
        return true;
      })
      .sort(
        (a, b) =>
          (ORDRE[a.vitrineStatut] ?? 9) - (ORDRE[b.vitrineStatut] ?? 9) ||
          a.titre.localeCompare(b.titre, "fr"),
      );
  }, [rows, q, statut, academy]);

  function toggleStatut(s: StatutFilter) {
    setStatut((cur) => (cur === s ? "TOUS" : s));
  }

  const cards = [
    { key: "PUBLIEE" as const, icon: Rocket, label: "En ligne", value: counts.PUBLIEE, tint: "text-emerald-600 dark:text-emerald-400" },
    { key: "MASQUEE" as const, icon: EyeOff, label: "Brouillons (non publiés)", value: counts.MASQUEE, tint: "text-muted-foreground" },
    { key: "SUSPENDUE" as const, icon: PauseCircle, label: "Suspendues", value: counts.SUSPENDUE, tint: "text-rose-600 dark:text-rose-400" },
  ];

  const chips: { value: StatutFilter; label: string }[] = [
    { value: "TOUS", label: "Toutes" },
    { value: "PUBLIEE", label: "En ligne" },
    { value: "MASQUEE", label: "Brouillons" },
    { value: "SUSPENDUE", label: "Suspendues" },
  ];

  return (
    <div className="space-y-4">
      {/* Stats cliquables = filtres de statut */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c) => {
          const active = statut === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => toggleStatut(c.key)}
              aria-pressed={active}
              className="text-left"
            >
              <Card
                className={cn(
                  "transition-all hover:shadow-md",
                  active && "ring-2 ring-primary",
                )}
              >
                <CardContent className="flex items-center gap-4 py-5">
                  <div className="rounded-xl bg-muted p-2.5">
                    <c.icon className={cn("h-5 w-5", c.tint)} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{c.value}</div>
                    <div className="text-sm text-muted-foreground">{c.label}</div>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {/* Barre de filtres : recherche + chips statut + catégorie */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un titre, un slug…"
            className="h-8 pl-8"
            aria-label="Rechercher une fiche"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {chips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setStatut(chip.value)}
                aria-pressed={statut === chip.value}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  statut === chip.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input hover:bg-muted",
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
          {academies.length > 1 && (
            <select
              value={academy}
              onChange={(e) => setAcademy(e.target.value)}
              className={cn(selectCx, "w-auto")}
              aria-label="Filtrer par catégorie"
            >
              <option value="">Toutes les catégories</option>
              {academies.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Table dense éditable (en-tête collant + défilement interne) */}
      <div className="rounded-lg border">
        <div className="max-h-[70vh] overflow-auto">
          <div
            className={cn(
              "sticky top-0 z-10 hidden items-center gap-3 border-b bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground backdrop-blur lg:grid",
              COLS,
            )}
          >
            <span>Formation</span>
            <span>Statut</span>
            <span>Tarif (€ HT)</span>
            <span>Durée</span>
            <span className="text-right">Actions</span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Aucune fiche ne correspond à ces filtres.
            </div>
          ) : (
            filtered.map((f) => <Row key={f.id} f={f} />)
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} fiche{filtered.length > 1 ? "s" : ""}
        {filtered.length !== rows.length ? ` sur ${rows.length}` : ""}
      </p>
    </div>
  );
}

/** Une ligne = un formulaire indépendant (action serveur par fiche conservée). */
function Row({ f }: { f: VitrineRow }) {
  const [formules, setFormules] = useState<Formules>(f.formules);
  const meta = STATUT_META[f.vitrineStatut];

  return (
    <form
      action={saveVitrineRowAction}
      className={cn(
        "grid grid-cols-1 items-center gap-2 border-b px-3 py-2.5 last:border-b-0 lg:gap-3",
        COLS,
      )}
    >
      <input type="hidden" name="id" value={f.id} readOnly />
      <input type="hidden" name="dureeHeures" value={f.dureeHeures} readOnly />
      {/* Formules : portées par des champs cachés pilotés par le dialogue.
          Le formulaire les renvoie toujours → l'action serveur reste intacte. */}
      <input type="hidden" name="formulePresentielHeures" value={formules.presentielHeures} readOnly />
      <input type="hidden" name="formulePresentielPrix" value={formules.presentielPrix} readOnly />
      <input type="hidden" name="formuleMixteHeures" value={formules.mixteHeures} readOnly />
      <input type="hidden" name="formuleMixtePrix" value={formules.mixtePrix} readOnly />
      <input type="hidden" name="formuleElearningHeures" value={formules.elearningHeures} readOnly />
      <input type="hidden" name="formuleElearningPrix" value={formules.elearningPrix} readOnly />

      {/* Identité */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={f.editUrl} className="truncate font-medium hover:underline">
            {f.titre}
          </Link>
          <Badge variant={meta.badge} className="lg:hidden">
            {meta.label}
          </Badge>
        </div>
        <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
          {f.reference}
        </div>
      </div>

      {/* Statut */}
      <select
        name="vitrineStatut"
        defaultValue={f.vitrineStatut}
        className={selectCx}
        aria-label={`Statut — ${f.titre}`}
      >
        {Object.entries(VITRINE_STATUT_LABELS).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>

      {/* Tarif */}
      <Input
        name="tarif"
        inputMode="decimal"
        placeholder="—"
        defaultValue={f.tarif}
        className="h-8"
        aria-label={`Tarif — ${f.titre}`}
      />

      {/* Durée */}
      <Input
        name="duree"
        placeholder="ex. 21h"
        defaultValue={f.duree}
        className="h-8"
        aria-label={`Durée — ${f.titre}`}
      />

      {/* Actions : fiche · formules · enregistrer */}
      <div className="flex items-center justify-start gap-1.5 lg:justify-end">
        {f.ficheUrl && (
          <a
            href={f.ficheUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-muted"
          >
            Fiche <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <FormulesDialog titre={f.titre} value={formules} onChange={setFormules} />
        <Button type="submit" variant="secondary" size="sm">
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

/** Dialogue d'édition des formules (présentiel · mixte · e-learning). */
function FormulesDialog({
  titre,
  value,
  onChange,
}: {
  titre: string;
  value: Formules;
  onChange: (v: Formules) => void;
}) {
  const hasAny = Object.values(value).some((v) => v.trim() !== "");
  const rows: { def: (typeof FORMULE_DEFS)[number]; hKey: keyof Formules; pKey: keyof Formules }[] = [
    { def: FORMULE_DEFS[0], hKey: "presentielHeures", pKey: "presentielPrix" },
    { def: FORMULE_DEFS[1], hKey: "mixteHeures", pKey: "mixtePrix" },
    { def: FORMULE_DEFS[2], hKey: "elearningHeures", pKey: "elearningPrix" },
  ];

  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Formules
        {hasAny && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Formules &amp; tarifs</DialogTitle>
          <DialogDescription>
            {titre} — présentiel · mixte · e-learning. Laissez vide pour garder les
            valeurs par défaut du site, puis cliquez sur « Enregistrer » sur la ligne.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {rows.map((r) => (
            <div
              key={r.def.key}
              className="grid grid-cols-1 gap-2 sm:grid-cols-[9rem_1fr_1fr] sm:items-center"
            >
              <span className="text-xs font-semibold">{r.def.label}</span>
              <Input
                value={value[r.hKey]}
                onChange={(e) => onChange({ ...value, [r.hKey]: e.target.value })}
                placeholder="Heures (ex. 35 h)"
                className="h-8"
              />
              <Input
                value={value[r.pKey]}
                onChange={(e) => onChange({ ...value, [r.pKey]: e.target.value })}
                placeholder="Prix (ex. 1 490 € ou Sur devis)"
                className="h-8"
              />
            </div>
          ))}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(EMPTY_FORMULES)}
          >
            Tout effacer
          </Button>
          <DialogClose render={<Button type="button" />}>Appliquer</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
