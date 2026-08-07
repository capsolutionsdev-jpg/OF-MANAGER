"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GripVertical, CalendarClock, User as UserIcon } from "lucide-react";
import { CrmStage } from "@prisma/client";
import {
  CRM_STAGE_ORDER,
  CRM_STAGE_LABELS,
  CRM_STAGE_ACCENT,
} from "@/lib/validators/crm";
import { setCrmStage } from "@/lib/actions/crm-actions";

export type PipelineCard = {
  id: string;
  nom: string;
  prenom: string;
  formationTitre: string | null;
  valeurEstimee: number | null;
  assigneeName: string | null;
  tags: string[];
  crmStage: CrmStage;
  relanceDate: string | null; // ISO
};

export function PipelineBoard({ initial }: { initial: PipelineCard[] }) {
  const router = useRouter();
  const [cards, setCards] = useState<PipelineCard[]>(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<CrmStage | null>(null);
  const [, startTransition] = useTransition();

  function move(id: string, stage: CrmStage) {
    const card = cards.find((c) => c.id === id);
    if (!card || card.crmStage === stage) return;
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, crmStage: stage } : c)),
    );
    startTransition(async () => {
      const res = await setCrmStage(id, stage);
      if (!res.ok) {
        toast.error(res.error ?? "Erreur.");
        setCards((prev) =>
          prev.map((c) => (c.id === id ? { ...c, crmStage: card.crmStage } : c)),
        );
        return;
      }
      toast.success(`Déplacé vers « ${CRM_STAGE_LABELS[stage]} »`);
      router.refresh();
    });
  }

  const euro = (n: number | null) =>
    n != null ? `${n.toLocaleString("fr-FR")} €` : null;
  const relanceLate = (iso: string | null) =>
    iso ? new Date(iso) <= new Date() : false;

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {CRM_STAGE_ORDER.map((stage) => {
        const col = cards.filter((c) => c.crmStage === stage);
        const sum = col.reduce((a, c) => a + (c.valeurEstimee ?? 0), 0);
        return (
          <div
            key={stage}
            onDragOver={(e) => {
              e.preventDefault();
              setOverStage(stage);
            }}
            onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) move(dragId, stage);
              setDragId(null);
              setOverStage(null);
            }}
            className={`flex w-72 shrink-0 flex-col rounded-xl border border-t-4 bg-muted/30 ${CRM_STAGE_ACCENT[stage]} ${
              overStage === stage ? "ring-2 ring-primary/40" : ""
            }`}
          >
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-semibold">
                {CRM_STAGE_LABELS[stage]}
              </span>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                {col.length}
                {sum > 0 ? ` · ${euro(sum)}` : ""}
              </span>
            </div>
            <div className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">
              {col.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => setDragId(c.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverStage(null);
                  }}
                  className="group cursor-grab rounded-lg border bg-background p-2.5 shadow-sm active:cursor-grabbing"
                >
                  <div className="flex items-start gap-1.5">
                    <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/candidats/${c.id}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {c.prenom} {c.nom}
                      </Link>
                      {c.formationTitre && (
                        <p className="truncate text-xs text-muted-foreground">
                          {c.formationTitre}
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {euro(c.valeurEstimee) && (
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                            {euro(c.valeurEstimee)}
                          </span>
                        )}
                        {c.assigneeName && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            <UserIcon className="h-2.5 w-2.5" /> {c.assigneeName}
                          </span>
                        )}
                        {c.relanceDate && (
                          <span
                            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] ${
                              relanceLate(c.relanceDate)
                                ? "bg-red-500/10 text-red-700 dark:text-red-300"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            <CalendarClock className="h-2.5 w-2.5" />
                            {new Date(c.relanceDate).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </div>
                      {c.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {col.length === 0 && (
                <p className="px-1 py-3 text-center text-xs text-muted-foreground/60">
                  Déposez un prospect ici
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
