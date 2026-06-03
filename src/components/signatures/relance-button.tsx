"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { relanceParcours } from "@/lib/actions/parcours-actions";

export function RelanceButton({
  inscriptionId,
  label = "Relancer",
}: {
  inscriptionId: string;
  label?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const res = await relanceParcours(inscriptionId);
      if (!res.ok) {
        toast.error(res.error ?? "Erreur.");
        return;
      }
      toast.success(
        res.demo
          ? "Relance préparée (mode démo — aucune clé e-mail)."
          : "Relance envoyée par e-mail.",
      );
      router.refresh();
    });
  }

  return (
    <Button size="sm" variant="outline" onClick={onClick} disabled={isPending}>
      <Send className="mr-1.5 h-3.5 w-3.5" />
      {isPending ? "Envoi…" : label}
    </Button>
  );
}
