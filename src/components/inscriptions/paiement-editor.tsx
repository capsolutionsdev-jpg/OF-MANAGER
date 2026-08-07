"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PaiementStatut } from "@prisma/client";
import {
  MODE_PAIEMENT_OPTIONS,
  PAIEMENT_STATUT_LABELS,
} from "@/lib/validators/inscription";
import { setInscriptionPaiement } from "@/lib/actions/inscription-actions";

const STATUT_BADGE: Record<PaiementStatut, string> = {
  EN_ATTENTE: "bg-muted text-muted-foreground",
  ACOMPTE: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  PAYE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  REMBOURSE: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  ANNULE: "bg-destructive/10 text-destructive",
};

const selectCls =
  "h-7 rounded-md border border-input bg-transparent px-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export function PaiementEditor({
  inscriptionId,
  modePaiement,
  paiementStatut,
}: {
  inscriptionId: string;
  modePaiement: string | null;
  paiementStatut: PaiementStatut;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState(modePaiement ?? "");
  const [statut, setStatut] = useState<PaiementStatut>(paiementStatut);

  function save(nextMode: string, nextStatut: PaiementStatut) {
    startTransition(async () => {
      const res = await setInscriptionPaiement(
        inscriptionId,
        nextMode || null,
        nextStatut,
      );
      if (!res.ok) {
        toast.error(res.error ?? "Erreur.");
        return;
      }
      toast.success("Paiement mis à jour.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        className={selectCls}
        value={mode}
        disabled={isPending}
        onChange={(e) => {
          setMode(e.target.value);
          save(e.target.value, statut);
        }}
        aria-label="Mode de paiement"
      >
        <option value="">Mode…</option>
        {MODE_PAIEMENT_OPTIONS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <select
        className={`${selectCls} font-medium ${STATUT_BADGE[statut]}`}
        value={statut}
        disabled={isPending}
        onChange={(e) => {
          const v = e.target.value as PaiementStatut;
          setStatut(v);
          save(mode, v);
        }}
        aria-label="État du paiement"
      >
        {(Object.keys(PAIEMENT_STATUT_LABELS) as PaiementStatut[]).map((k) => (
          <option key={k} value={k}>
            {PAIEMENT_STATUT_LABELS[k]}
          </option>
        ))}
      </select>
    </div>
  );
}
