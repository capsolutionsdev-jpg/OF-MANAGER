"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendCompteRenduAction } from "@/lib/actions/compte-rendu-actions";

export function SendCompteRenduButton({
  sessionId,
  sent,
}: {
  sessionId: string;
  sent: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const res = await sendCompteRenduAction(sessionId);
      if (!res.ok) {
        toast.error(res.error ?? "Erreur.");
        return;
      }
      toast.success(
        res.demo
          ? "Lien compte-rendu préparé (mode démo)."
          : "Lien compte-rendu envoyé au formateur.",
      );
      router.refresh();
    });
  }

  return (
    <Button variant="outline" onClick={onClick} disabled={isPending}>
      <ClipboardList className="mr-2 h-4 w-4" />
      {isPending
        ? "Envoi…"
        : sent
          ? "Relancer le compte-rendu"
          : "Envoyer le compte-rendu"}
    </Button>
  );
}
