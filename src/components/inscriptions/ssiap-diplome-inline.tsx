"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setCandidatSsiap } from "@/lib/actions/candidat-actions";

/**
 * Éditeur inline du diplôme SSIAP DÉTENU par un candidat (n° + date d'obtention).
 * Affiché sur les sessions de recyclage / remise à niveau SSIAP : la valeur est
 * retranscrite sur l'attestation générée (« Vu le diplôme SSIAP n° … obtenu le … »).
 */
export function SsiapDiplomeInline({
  candidatId,
  numero,
  date,
  niveau,
}: {
  candidatId: string;
  numero?: string | null;
  date?: string | null; // ISO yyyy-mm-dd
  niveau?: number | null;
}) {
  const router = useRouter();
  const [num, setNum] = useState(numero ?? "");
  const [dt, setDt] = useState(date ?? "");
  const [pending, start] = useTransition();
  const dirty = num !== (numero ?? "") || dt !== (date ?? "");

  function save() {
    start(async () => {
      const r = await setCandidatSsiap(candidatId, {
        numero: num,
        date: dt,
        niveau: niveau ? String(niveau) : undefined,
      });
      if (r.ok) {
        toast.success("N° de diplôme SSIAP enregistré.");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex-1 min-w-[11rem]">
        <label className="mb-0.5 block text-[11px] font-medium text-muted-foreground">
          N° du diplôme SSIAP détenu
        </label>
        <Input
          value={num}
          onChange={(e) => setNum(e.target.value)}
          placeholder="091-9119-1-2018-00246"
          className="h-8"
        />
      </div>
      <div>
        <label className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Obtenu le</label>
        <Input type="date" value={dt} onChange={(e) => setDt(e.target.value)} className="h-8 w-36" />
      </div>
      <Button size="sm" variant="outline" onClick={save} disabled={pending || !dirty} className="h-8 gap-1.5">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Enregistrer
      </Button>
    </div>
  );
}
