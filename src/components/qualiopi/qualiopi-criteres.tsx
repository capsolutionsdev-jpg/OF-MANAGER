"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { QualiopiStatut } from "@prisma/client";
import { cn } from "@/lib/utils";
import { CRITERES } from "@/lib/qualiopi-indicateurs";
import { QualiopiRow } from "@/components/qualiopi/qualiopi-row";

/** Ligne d'indicateur sérialisée (pas d'objet Prisma côté client). */
export type IndicateurRow = {
  id: string;
  numero: number;
  libelle: string;
  statut: QualiopiStatut;
  commentaire: string | null;
};

type Filtre = "TOUS" | QualiopiStatut;

const FILTRES: { value: Filtre; label: string }[] = [
  { value: "TOUS", label: "Tous" },
  { value: "NON_CONFORME", label: "Non conformes" },
  { value: "EN_COURS", label: "En cours" },
  { value: "CONFORME", label: "Conformes" },
  { value: "NON_APPLICABLE", label: "N/A" },
];

// On déduit le critère (1-7) depuis le numéro de l'indicateur (RNQ).
function critereDeNumero(n: number): number {
  return n <= 3 ? 1 : n <= 8 ? 2 : n <= 16 ? 3 : n <= 20 ? 4 : n <= 22 ? 5 : n <= 29 ? 6 : 7;
}

/** Comptes par statut d'un lot d'indicateurs. */
function compter(rows: IndicateurRow[]) {
  return {
    total: rows.length,
    conf: rows.filter((r) => r.statut === "CONFORME").length,
    nonConf: rows.filter((r) => r.statut === "NON_CONFORME").length,
    enCours: rows.filter((r) => r.statut === "EN_COURS").length,
    na: rows.filter((r) => r.statut === "NON_APPLICABLE").length,
  };
}

/** Critères Qualiopi en accordéon (repli individuel) filtrable par statut.
 * Remplace les 7 cartes toujours déployées : la page reste courte, chaque
 * critère porte un compteur d'anomalies dans son en-tête. */
export function QualiopiCriteres({ indicateurs }: { indicateurs: IndicateurRow[] }) {
  const [filtre, setFiltre] = useState<Filtre>("TOUS");
  // Par défaut : on déploie les critères qui portent une non-conformité.
  const [open, setOpen] = useState<Set<number>>(() => {
    const s = new Set<number>();
    for (const ind of indicateurs) {
      if (ind.statut === "NON_CONFORME") s.add(critereDeNumero(ind.numero));
    }
    return s;
  });

  const globaux = useMemo(() => compter(indicateurs), [indicateurs]);

  // Regroupement par critère (l'entrée arrive déjà triée par numéro).
  const groupes = useMemo(() => {
    const map = new Map<number, IndicateurRow[]>();
    for (const ind of indicateurs) {
      const c = critereDeNumero(ind.numero);
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(ind);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [indicateurs]);

  function toggle(critere: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(critere)) next.delete(critere);
      else next.add(critere);
      return next;
    });
  }

  const forced = filtre !== "TOUS";
  const matches = (r: IndicateurRow) => filtre === "TOUS" || r.statut === filtre;

  // Groupes réellement affichés compte tenu du filtre.
  const visibles = groupes.filter(([, rows]) => rows.some(matches));

  return (
    <div className="space-y-4">
      {/* Chips de filtre */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTRES.map((f) => {
          const n =
            f.value === "TOUS"
              ? globaux.total
              : f.value === "CONFORME"
                ? globaux.conf
                : f.value === "NON_CONFORME"
                  ? globaux.nonConf
                  : f.value === "EN_COURS"
                    ? globaux.enCours
                    : globaux.na;
          const active = filtre === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFiltre(f.value)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums",
                  active ? "bg-primary-foreground/20" : "bg-muted",
                )}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {/* Accordéon des critères */}
      {visibles.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucun indicateur ne correspond à ce filtre.
        </p>
      ) : (
        <div className="space-y-2">
          {visibles.map(([critere, rows]) => {
            const c = compter(rows);
            const isOpen = forced || open.has(critere);
            const shown = rows.filter(matches);
            return (
              <div
                key={critere}
                className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/[0.06]"
              >
                {forced ? (
                  <div className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    <CritereHeader critere={critere} counts={c} />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggle(critere)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <CritereHeader critere={critere} counts={c} />
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                )}
                {isOpen && (
                  <div className="border-t">
                    {shown.map((ind) => (
                      <QualiopiRow
                        key={ind.id}
                        id={ind.id}
                        numero={ind.numero}
                        libelle={ind.libelle}
                        statut={ind.statut}
                        commentaire={ind.commentaire}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CritereHeader({
  critere,
  counts,
}: {
  critere: number;
  counts: ReturnType<typeof compter>;
}) {
  return (
    <>
      <span className="min-w-0 flex-1 text-sm font-medium">{CRITERES[critere]}</span>
      <span className="flex shrink-0 items-center gap-1.5">
        {counts.nonConf > 0 && (
          <Pill className="bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300">
            {counts.nonConf} non conforme{counts.nonConf > 1 ? "s" : ""}
          </Pill>
        )}
        {counts.enCours > 0 && (
          <Pill className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            {counts.enCours} en cours
          </Pill>
        )}
        {counts.nonConf === 0 && counts.enCours === 0 && counts.conf > 0 && (
          <Pill className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            Conforme
          </Pill>
        )}
        <span className="text-xs tabular-nums text-muted-foreground">
          {counts.total} ind.
        </span>
      </span>
    </>
  );
}

function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[0.7rem] font-semibold whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}
