"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runAutomationsNow } from "@/lib/actions/automation-actions";

export function RunAutomationsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const res = await runAutomationsNow();
      if (!res.ok) {
        toast.error("Non autorisé.");
        return;
      }
      const c = res.counts;
      const total =
        c.convocations +
        c.attestationsEntree +
        c.satisfactions +
        c.docsFin +
        c.compteRendus +
        c.emargements;
      if (total === 0) {
        toast.info("Aucun envoi à effectuer pour le moment (rien d'éligible).");
      } else {
        const parts = [
          c.convocations && `${c.convocations} convocation(s)`,
          c.attestationsEntree && `${c.attestationsEntree} attestation(s) d'entrée`,
          c.satisfactions && `${c.satisfactions} enquête(s) satisfaction`,
          c.docsFin && `${c.docsFin} docs de fin`,
          c.compteRendus && `${c.compteRendus} compte(s) rendu formateur`,
          c.emargements && `${c.emargements} émargement(s)`,
        ].filter(Boolean);
        toast.success(
          `${total} e-mail(s) ${res.demo ? "préparé(s) (mode démo)" : "envoyé(s)"} : ${parts.join(", ")}.`,
        );
      }
      router.refresh();
    });
  }

  return (
    <Button onClick={onClick} disabled={isPending}>
      <Play className="mr-2 h-4 w-4" />
      {isPending ? "Exécution…" : "Exécuter les automatismes"}
    </Button>
  );
}
