"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendContratFormateurAction } from "@/lib/actions/contrat-formateur-actions";

export function SendContratButton({
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
      const res = await sendContratFormateurAction(sessionId);
      if (!res.ok) {
        toast.error(res.error ?? "Erreur.");
        return;
      }
      toast.success(
        res.demo
          ? "Contrat préparé (mode démo) — lien dans le journal des e-mails."
          : "Contrat envoyé au formateur pour signature.",
      );
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={isPending}>
      <FileSignature className="mr-1.5 h-3.5 w-3.5" />
      {isPending ? "Envoi…" : sent ? "Renvoyer le contrat" : "Envoyer le contrat à signer"}
    </Button>
  );
}
