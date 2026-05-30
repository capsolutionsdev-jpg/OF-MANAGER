"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { QualiopiStatut } from "@prisma/client";
import { Input } from "@/components/ui/input";
import {
  QUALIOPI_STATUT_LABELS,
  QUALIOPI_STATUT_BADGE,
} from "@/lib/qualiopi-indicateurs";
import { updateIndicateur } from "@/lib/actions/qualiopi-actions";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-40";

export function QualiopiRow({
  id,
  numero,
  libelle,
  statut,
  commentaire,
}: {
  id: string;
  numero: number;
  libelle: string;
  statut: QualiopiStatut;
  commentaire: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState<QualiopiStatut>(statut);

  function onStatut(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value as QualiopiStatut;
    setCurrent(value);
    startTransition(async () => {
      const res = await updateIndicateur(id, { statut: value });
      if (res.ok) {
        toast.success(`Indicateur ${numero} mis à jour`);
        router.refresh();
      } else toast.error("Erreur");
    });
  }

  function onCommentaire(e: React.FocusEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (value === (commentaire ?? "")) return;
    startTransition(async () => {
      const res = await updateIndicateur(id, { commentaire: value });
      if (res.ok) toast.success(`Commentaire enregistré (ind. ${numero})`);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-2 border-b px-4 py-3 last:border-0 sm:grid-cols-[1fr_auto]">
      <div className="flex gap-3">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${QUALIOPI_STATUT_BADGE[current]}`}
        >
          {numero}
        </span>
        <div className="min-w-0">
          <p className="text-sm">{libelle}</p>
          <Input
            defaultValue={commentaire ?? ""}
            placeholder="Commentaire / preuve…"
            onBlur={onCommentaire}
            className="mt-2 h-8 text-xs"
          />
        </div>
      </div>
      <select
        className={selectClass}
        value={current}
        onChange={onStatut}
        disabled={isPending}
      >
        {Object.entries(QUALIOPI_STATUT_LABELS).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}
