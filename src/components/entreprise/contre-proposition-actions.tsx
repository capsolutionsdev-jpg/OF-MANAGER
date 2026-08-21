"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  accepterContreProposition,
  refuserContreProposition,
} from "@/lib/actions/demande-inscription-actions";

export function ContrePropositionActions({ demandeId }: { demandeId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function accepter() {
    start(async () => {
      const r = await accepterContreProposition(demandeId);
      if (!r.ok) {
        toast.error(r.error ?? "L'action a échoué.");
        return;
      }
      toast.success("Nouvelle date acceptée. Votre organisme va finaliser l'inscription.");
      router.refresh();
    });
  }
  function refuser() {
    start(async () => {
      const r = await refuserContreProposition(demandeId);
      if (!r.ok) {
        toast.error(r.error ?? "L'action a échoué.");
        return;
      }
      toast.success("Proposition refusée.");
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={refuser} disabled={pending}>
        <X className="mr-1.5 h-4 w-4" />
        Refuser
      </Button>
      <Button size="sm" onClick={accepter} disabled={pending}>
        {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
        Accepter
      </Button>
    </div>
  );
}
