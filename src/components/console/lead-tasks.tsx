"use client";

import { useState, useTransition, type FormEvent } from "react";
import { CalendarClock, Loader2, Plus, Trash2 } from "lucide-react";
import { addLeadTask, toggleLeadTask, deleteLeadTask } from "@/lib/actions/growth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

/**
 * Tâches de relance d'un lead : cocher / décocher, supprimer (avec
 * confirmation) et ajouter (titre + échéance optionnelle).
 */

export type LeadTaskItem = {
  id: string;
  titre: string;
  done: boolean;
  dueAt: Date | null;
};

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Échéance dépassée = strictement avant aujourd'hui (minuit local). */
function estEnRetard(task: LeadTaskItem): boolean {
  if (task.done || !task.dueAt) return false;
  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);
  return new Date(task.dueAt).getTime() < debutJour.getTime();
}

function TaskRow({ task }: { task: LeadTaskItem }) {
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const enRetard = estEnRetard(task);

  return (
    <li className="flex items-start gap-2.5 rounded-lg border p-2.5">
      <input
        type="checkbox"
        checked={task.done}
        disabled={pending}
        onChange={() => start(() => toggleLeadTask(task.id))}
        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        aria-label={task.done ? "Marquer comme à faire" : "Marquer comme faite"}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", task.done && "text-muted-foreground line-through")}>
          {task.titre}
        </p>
        {task.dueAt && (
          <p
            className={cn(
              "mt-0.5 inline-flex items-center gap-1 text-xs",
              enRetard ? "font-medium text-destructive" : "text-muted-foreground",
            )}
          >
            <CalendarClock className="h-3 w-3" />
            Échéance : {fmtDate(task.dueAt)}
            {enRetard && " · en retard"}
          </p>
        )}
      </div>
      {pending && <Loader2 className="mt-1 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      <Button
        size="icon-sm"
        variant="ghost"
        className="text-muted-foreground hover:text-destructive"
        disabled={pending}
        aria-label="Supprimer la tâche"
        onClick={async () => {
          if (
            await confirm({
              title: "Supprimer cette tâche ?",
              description: task.titre,
              destructive: true,
              confirmLabel: "Supprimer",
            })
          ) {
            start(() => deleteLeadTask(task.id));
          }
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}

export function LeadTasks({ leadId, tasks }: { leadId: string; tasks: LeadTaskItem[] }) {
  const [titre, setTitre] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [adding, startAdd] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!titre.trim()) return;
    startAdd(async () => {
      const res = await addLeadTask(leadId, titre, dueAt || null);
      if (res.ok) {
        setTitre("");
        setDueAt("");
        setErreur(null);
      } else {
        setErreur(res.error ?? "Impossible d'ajouter la tâche.");
      }
    });
  }

  return (
    <div className="space-y-3">
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune tâche de relance.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </ul>
      )}

      <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
        <Input
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Nouvelle tâche de relance…"
          className="min-w-40 flex-1"
          disabled={adding}
          aria-label="Titre de la tâche"
        />
        <Input
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="w-36"
          disabled={adding}
          aria-label="Échéance (optionnelle)"
        />
        <Button type="submit" size="sm" disabled={adding || !titre.trim()}>
          {adding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Ajouter
        </Button>
      </form>
      {erreur && <p className="text-xs text-destructive">{erreur}</p>}
    </div>
  );
}
