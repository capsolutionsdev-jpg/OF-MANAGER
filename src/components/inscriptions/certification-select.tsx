"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CertificationResultat } from "@prisma/client";
import { CERTIFICATION_LABELS } from "@/lib/validators/inscription";
import { setCertification } from "@/lib/actions/inscription-actions";

const CLS: Record<CertificationResultat, string> = {
  NON_EVALUE: "border-input bg-transparent text-muted-foreground",
  CERTIFIE: "border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  AJOURNE: "border-amber-300 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  ABANDON: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function CertificationSelect({
  inscriptionId,
  value,
}: {
  inscriptionId: string;
  value: CertificationResultat;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [val, setVal] = useState<CertificationResultat>(value);

  function onChange(next: CertificationResultat) {
    setVal(next);
    startTransition(async () => {
      const res = await setCertification(inscriptionId, next);
      if (!res.ok) {
        toast.error(res.error ?? "Erreur.");
        return;
      }
      toast.success("Résultat enregistré (reporté au BPF).");
      router.refresh();
    });
  }

  return (
    <select
      aria-label="Résultat de certification"
      disabled={isPending}
      value={val}
      onChange={(e) => onChange(e.target.value as CertificationResultat)}
      className={`h-7 rounded-md border px-1.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${CLS[val]}`}
    >
      {(Object.keys(CERTIFICATION_LABELS) as CertificationResultat[]).map((k) => (
        <option key={k} value={k}>
          {CERTIFICATION_LABELS[k]}
        </option>
      ))}
    </select>
  );
}
