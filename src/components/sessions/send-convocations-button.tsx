"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { sendConvocationsForSession } from "@/lib/actions/email-actions";

export function SendConvocationsButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  async function handleSend() {
    const ok = await confirm({
      title: "Envoyer les convocations ?",
      description:
        "Un e-mail de convocation va être envoyé à tous les participants inscrits (les inscriptions annulées ou suspendues sont exclues). Vérifiez les dates, l'horaire et le lieu de la session avant l'envoi.",
      confirmLabel: "Envoyer les convocations",
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await sendConvocationsForSession(sessionId);
      if (!res.ok) {
        toast.error(res.error ?? "Erreur lors de l'envoi.");
        return;
      }
      if (res.total === 0) {
        toast.info("Aucun participant convocable (hors annulés/suspendus) à cette session.");
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
    <Button variant="outline" onClick={() => void handleSend()} disabled={isPending}>
      <Mail className="mr-2 h-4 w-4" />
      {isPending ? "Envoi…" : "Envoyer les convocations"}
    </Button>
  );
}
