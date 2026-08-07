"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Heart, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { demanderInscription } from "@/lib/actions/candidat-portal-actions";

/** Bouton « Je suis intéressé » — envoie une demande d'inscription à l'organisme. */
export function InterestButton({ formationId }: { formationId: string }) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function click() {
    startTransition(async () => {
      const r = await demanderInscription(formationId);
      if (r.ok) {
        setDone(true);
        toast.success("Demande envoyée ! L'organisme va vous recontacter.");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
        <Check className="h-4 w-4" /> Demande envoyée
      </span>
    );
  }

  return (
    <Button size="sm" onClick={click} disabled={isPending}>
      {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Heart className="mr-1.5 h-4 w-4" />}
      Je suis intéressé(e)
    </Button>
  );
}
