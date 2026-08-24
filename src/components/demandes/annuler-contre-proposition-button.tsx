"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { annulerContreProposition } from "@/lib/actions/demande-inscription-actions";

/** STAFF : annule une contre-proposition restée sans réponse du client. */
export function AnnulerContrePropositionButton({ demandeId }: { demandeId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
      disabled={pending}
      title="Retirer l'offre alternative (la demande sera annulée)"
      onClick={() => start(async () => {
        const res = await annulerContreProposition(demandeId);
        if (!res.ok) { toast.error(res.error ?? "L'annulation a échoué."); return; }
        toast.success("Contre-proposition annulée.");
        router.refresh();
      })}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
      Annuler
    </Button>
  );
}
