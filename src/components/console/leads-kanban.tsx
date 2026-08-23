"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ListTodo, Loader2, Flame } from "lucide-react";
import { setLeadStatut } from "@/lib/actions/console-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TONE_CLASSES } from "@/components/ui/status-badge";
import { STATUT_OPTIONS } from "@/components/console/lead-statut";
import { nextStage, prevStage } from "@/lib/growth/pipeline";
import { temperature, appelUrgent, type QualifInput } from "@/lib/growth/qualification";
import { cn } from "@/lib/utils";
import type { LeadRow } from "@/components/console/leads-table";

/** Lead enrichi pour le pipeline : score d'engagement + tâches encore ouvertes. */
export type LeadKanbanRow = LeadRow & {
  score: number;
  tasks: { id: string }[];
};

/** Colonnes du pipeline (8 étapes + Perdu), dans l'ordre de progression. */
const COLONNES = STATUT_OPTIONS;

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
}

/** Teinte du badge de score d'engagement : chaud → tiède → froid. */
function scoreBadgeClass(score: number) {
  if (score >= 50) return TONE_CLASSES.success;
  if (score >= 25) return TONE_CLASSES.warning;
  return TONE_CLASSES.neutral;
}

/** Attributs de qualification (5 axes) extraits du lead. */
function qualifOf(l: LeadKanbanRow): QualifInput {
  return {
    verticale: l.verticale as QualifInput["verticale"],
    outilActuel: l.outilActuel as QualifInput["outilActuel"],
    echeanceQualiopi: l.echeanceQualiopi as QualifInput["echeanceQualiopi"],
    volumeStagiairesMois: l.volumeStagiairesMois,
    malARemplir: l.malARemplir,
  };
}

const TEMP_META: Record<string, { label: string; cls: string }> = {
  chaud: { label: "Chaud", cls: TONE_CLASSES.success },
  tiede: { label: "Tiède", cls: TONE_CLASSES.warning },
  froid: { label: "Froid", cls: TONE_CLASSES.neutral },
};

function KanbanCard({ lead }: { lead: LeadKanbanRow }) {
  const [pending, start] = useTransition();

  // Progression le long du pipeline (8 étapes) — PERDU est hors flux : on ne
  // peut donc jamais « avancer » un SIGNE vers Perdu par les flèches.
  const suivant = nextStage(lead.statut);
  const precedent = prevStage(lead.statut);
  const aller = (cible: string | null) => {
    if (!cible) return;
    start(() => setLeadStatut(lead.id, cible));
  };

  const q = qualifOf(lead);
  const temp = TEMP_META[temperature(q)];
  const urgent = appelUrgent(q);

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow",
        !lead.lu && "ring-1 ring-primary/40",
        pending && "opacity-60",
      )}
    >
      <Link
        href={`/console/prospects/${lead.id}`}
        className="absolute inset-0 rounded-lg"
        aria-label={`Ouvrir la fiche de ${lead.nom}`}
      />

      <p className="flex items-center gap-1.5 text-sm font-medium leading-tight">
        {!lead.lu && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Non lu" />}
        <span className="truncate">{lead.nom}</span>
      </p>
      {(lead.representantLegal || lead.organisme) && (
        <p className="truncate text-xs text-muted-foreground">{lead.representantLegal || lead.organisme}</p>
      )}
      {lead.email ? (
        <p className="truncate text-xs text-muted-foreground">{lead.email}</p>
      ) : (
        (lead.ville || lead.departement) && (
          <p className="truncate text-xs text-muted-foreground">{[lead.ville, lead.departement].filter(Boolean).join(" · ")}</p>
        )
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge className={cn("text-[11px]", temp.cls)}>{temp.label}</Badge>
        <Badge className={cn("text-[11px]", scoreBadgeClass(lead.score))}>Score {lead.score}</Badge>
        {urgent && (
          <span className="relative z-10 inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
            <Flame className="h-3 w-3" /> Appel 24 h
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{fmt(lead.createdAt)}</span>
          {lead.tasks.length > 0 && (
            <span className="inline-flex items-center gap-0.5 font-medium text-warning">
              <ListTodo className="h-3 w-3" />
              {lead.tasks.length}
            </span>
          )}
        </p>
        <div className="relative z-10 flex items-center gap-0.5">
          {pending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          <Button
            size="icon-xs"
            variant="ghost"
            disabled={pending || !precedent}
            onClick={() => aller(precedent)}
            aria-label={`Reculer ${lead.nom}`}
          >
            <ChevronLeft />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            disabled={pending || !suivant}
            onClick={() => aller(suivant)}
            aria-label={`Avancer ${lead.nom}`}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Vue pipeline : 8 étapes + Perdu, scroll horizontal, déplacement par flèches. */
export function LeadsKanban({ leads }: { leads: LeadKanbanRow[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {COLONNES.map((col) => {
        const items = leads.filter((l) => l.statut === col.key);
        return (
          <div key={col.key} className="flex w-64 shrink-0 flex-col rounded-xl border bg-muted/30">
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{col.label}</p>
              <span className="ml-auto rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
                {items.length}
              </span>
            </div>
            <div className="max-h-[65vh] space-y-2 overflow-y-auto p-2">
              {items.length === 0 ? (
                <p className="p-3 text-center text-xs text-muted-foreground">—</p>
              ) : (
                items.map((lead) => <KanbanCard key={lead.id} lead={lead} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
