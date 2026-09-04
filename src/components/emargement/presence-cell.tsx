"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { PresenceStatut } from "@prisma/client";
import { PRESENCE_LABELS } from "@/lib/presence";
import { setPresence } from "@/lib/actions/emargement-actions";

export function PresenceCell({
  seanceId,
  apprenantId,
  statut,
}: {
  seanceId: string;
  apprenantId: string;
  statut: PresenceStatut | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState<string>(statut ?? "");
  const [isPending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value as PresenceStatut;
    setValue(v);
    startTransition(async () => {
      const res = await setPresence(seanceId, apprenantId, v);
      if (res.ok) {
        toast.success("Présence enregistrée");
        router.refresh();
      } else toast.error("Erreur");
    });
  }

  return (
    <select
      value={value}
      onChange={onChange}
      disabled={isPending}
      className="h-7 rounded border border-input bg-transparent px-1.5 text-xs outline-none pointer-coarse:min-h-11 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <option value="" disabled>
        —
      </option>
      {Object.entries(PRESENCE_LABELS).map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}
