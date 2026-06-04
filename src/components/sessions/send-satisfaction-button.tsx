"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendSatisfactionManual } from "@/lib/actions/inscription-actions";

export function SendSatisfactionButton({
  inscriptionId,
  sent,
}: {
  inscriptionId: string;
  sent: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const res = await sendSatisfactionManual(inscriptionId);
      if (!res.ok) {
        toast.error(res.error ?? "Erreur.");
        return;
      }
      toast.success(
        res.error ?? "Enquête de satisfaction envoyée au candidat.",
      );
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={isPending}>
      <Send className="mr-1.5 h-3.5 w-3.5" />
      {isPending ? "Envoi…" : sent ? "Relancer satisfaction" : "Envoyer satisfaction"}
    </Button>
  );
}
