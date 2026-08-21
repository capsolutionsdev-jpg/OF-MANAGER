"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  confirmerDemandeInscription,
  refuserDemandeInscription,
} from "@/lib/actions/demande-inscription-actions";

export function DemandeActions({ demandeId }: { demandeId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [refusing, setRefusing] = useState(false);
  const [motif, setMotif] = useState("");

  function confirmer() {
    start(async () => {
      const res = await confirmerDemandeInscription(demandeId);
      if (!res.ok) {
        toast.error(res.error ?? "La confirmation a échoué.");
        return;
      }
      toast.success("Demande confirmée — convention et inscriptions créées.");
      if (res.warning) toast.warning(res.warning);
      router.refresh();
    });
  }

  function refuser() {
    start(async () => {
      const res = await refuserDemandeInscription(demandeId, motif);
      if (!res.ok) {
        toast.error(res.error ?? "Le refus a échoué.");
        return;
      }
      toast.success("Demande refusée.");
      setRefusing(false);
      setMotif("");
      router.refresh();
    });
  }

  if (refusing) {
    return (
      <div className="flex flex-col items-end gap-2">
        <input
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Motif (facultatif)"
          className="h-8 w-56 rounded-md border bg-card px-2 text-sm"
        />
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setRefusing(false)} disabled={pending}>
            Annuler
          </Button>
          <Button size="sm" variant="destructive" onClick={refuser} disabled={pending}>
            {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Confirmer le refus
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Button size="sm" variant="outline" onClick={() => setRefusing(true)} disabled={pending}>
        <X className="mr-1.5 h-4 w-4" />
        Refuser
      </Button>
      <Button size="sm" onClick={confirmer} disabled={pending}>
        {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
        Confirmer
      </Button>
    </div>
  );
}
