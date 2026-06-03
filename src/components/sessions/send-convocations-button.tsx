"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendConvocationsForSession } from "@/lib/actions/email-actions";

export function SendConvocationsButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const res = await sendConvocationsForSession(sessionId);
      if (!res.ok) {
        toast.error(res.error ?? "Erreur lors de l'envoi.");
        return;
      }
      if (res.total === 0) {
        toast.info("Aucun candidat inscrit à cette session.");
      } else if (res.demo) {
        toast.success(
          `${res.total} convocation(s) préparée(s) — mode démo (aucune clé e-mail). Voir le journal des e-mails.`,
        );
      } else {
        toast.success(`${res.sent}/${res.total} convocation(s) envoyée(s).`);
      }
      router.refresh();
    });
  }

  return (
    <Button variant="outline" onClick={onClick} disabled={isPending}>
      <Mail className="mr-2 h-4 w-4" />
      {isPending ? "Envoi…" : "Envoyer les convocations"}
    </Button>
  );
}
