"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ListTodo, Loader2 } from "lucide-react";
import { setLeadStatut } from "@/lib/actions/console-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LeadRow } from "@/components/console/leads-table";

/** Lead enrichi pour le pipeline : score d'engagement + tâches encore ouvertes. */
export type LeadKanbanRow = LeadRow & {
  score: number;
  tasks: { id: string }[];
};

/** Colonnes du pipeline, dans l'ordre de progression commerciale. */
const COLONNES = [
  { key: "NOUVEAU", label: "Nouveau", accent: "bg-blue-500" },
  { key: "A_RAPPELER", label: "À rappeler", accent: "bg-amber-500" },
  { key: "RAPPELE", label: "Rappelé", accent: "bg-violet-500" },
  { key: "CONVERTI", label: "Converti", accent: "bg-emerald-500" },
  { key: "PERDU", label: "Perdu", accent: "bg-slate-400" },
] as const;

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
}

/** Teinte du badge de score : chaud (émeraude) → tiède (ambre) → froid (ardoise). */
function scoreBadgeClass(score: number) {
  if (score >= 50) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (score >= 25) return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "bg-slate-500/10 text-slate-600 dark:text-slate-300";
}

function KanbanCard({ lead, colIndex }: { lead: LeadKanbanRow; colIndex: number }) {
  const [pending, start] = useTransition();

  const move = (delta: number) => {
    const cible = COLONNES[colIndex + delta];
    if (!cible) return;
    start(() => setLeadStatut(lead.id, cible.key));
  };

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow",
        !lead.lu && "ring-1 ring-primary/40",
        pending && "opacity-60",
      )}
    >
      {/* Toute la carte ouvre la fiche du prospect (les contrôles restent au-dessus). */}
      <Link
        href={`/console/prospects/${lead.id}`}
        className="absolute inset-0 rounded-lg"
        aria-label={`Ouvrir la fiche de ${lead.nom}`}
      />

      <p className="flex items-center gap-1.5 text-sm font-medium leading-tight">
        {!lead.lu && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Non lu" />}
        <span className="truncate">{lead.nom}</span>
      </p>
      {lead.organisme && <p className="truncate text-xs text-muted-foreground">{lead.organisme}</p>}
      <p className="truncate text-xs text-muted-foreground">{lead.email}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge className={cn("text-[11px]", scoreBadgeClass(lead.score))}>Score {lead.score}</Badge>
        <Badge variant="outline" className="text-[11px]">{lead.source === "demo" ? "Démo" : "Contact"}</Badge>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{fmt(lead.createdAt)}</span>
          {lead.tasks.length > 0 && (
            <span className="inline-flex items-center gap-0.5 font-medium text-amber-700 dark:text-amber-300">
              <ListTodo className="h-3 w-3" />
              {lead.tasks.length} tâche{lead.tasks.length > 1 ? "s" : ""}
            </span>
          )}
        </p>
        <div className="relative z-10 flex items-center gap-0.5">
          {pending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          <Button
            size="icon-xs"
            variant="ghost"
            disabled={pending || colIndex === 0}
            onClick={() => move(-1)}
            aria-label={`Déplacer ${lead.nom} vers ${COLONNES[colIndex - 1]?.label ?? ""}`}
          >
            <ChevronLeft />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            disabled={pending || colIndex === COLONNES.length - 1}
            onClick={() => move(1)}
            aria-label={`Déplacer ${lead.nom} vers ${COLONNES[colIndex + 1]?.label ?? ""}`}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Vue pipeline des prospects : 5 colonnes par statut, déplacement par flèches. */
export function LeadsKanban({ leads }: { leads: LeadKanbanRow[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {COLONNES.map((col, colIndex) => {
        const items = leads.filter((l) => l.statut === col.key);
        return (
          <div key={col.key} className="flex flex-col rounded-xl border bg-muted/30">
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <span className={cn("h-2 w-2 rounded-full", col.accent)} />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{col.label}</p>
              <span className="ml-auto rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
                {items.length}
              </span>
            </div>
            <div className="max-h-[65vh] space-y-2 overflow-y-auto p-2">
              {items.length === 0 ? (
                <p className="p-3 text-center text-xs text-muted-foreground">Aucun prospect</p>
              ) : (
                items.map((lead) => <KanbanCard key={lead.id} lead={lead} colIndex={colIndex} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
