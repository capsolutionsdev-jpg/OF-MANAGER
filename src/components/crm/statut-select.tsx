"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CandidatStatut } from "@prisma/client";
import { STATUT_LABELS } from "@/lib/validators/candidat";
import { setCandidatStatut } from "@/lib/actions/candidat-actions";

export function StatutSelect({
  id,
  statut,
}: {
  id: string;
  statut: CandidatStatut;
}) {
  const router = useRouter();
  const [value, setValue] = useState<CandidatStatut>(statut);
  const [isPending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value as CandidatStatut;
    setValue(v);
    startTransition(async () => {
      const res = await setCandidatStatut(id, v);
      if (res.ok) {
        toast.success("Statut mis à jour");
        router.refresh();
      } else toast.error("Erreur");
    });
  }

  return (
    <select
      value={value}
      onChange={onChange}
      disabled={isPending}
      className="mt-2 h-7 w-full rounded border border-input bg-background px-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {Object.entries(STATUT_LABELS).map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}
