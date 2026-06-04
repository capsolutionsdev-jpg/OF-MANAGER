"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendEmargementLink } from "@/lib/actions/emargement-signature-actions";

export function SendEmargementLinkButton({
  emargementId,
  sent,
}: {
  emargementId: string;
  sent: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const res = await sendEmargementLink(emargementId);
      if (!res.ok) {
        toast.error(res.error ?? "Erreur.");
        return;
      }
      toast.success(res.error ?? "Lien de signature envoyé.");
      router.refresh();
    });
  }

  return (
    <Button
      variant={sent ? "ghost" : "outline"}
      size="sm"
      onClick={onClick}
      disabled={isPending}
    >
      <Send className="mr-1.5 h-3.5 w-3.5" />
      {isPending ? "Envoi…" : sent ? "Relancer" : "Envoyer le lien"}
    </Button>
  );
}
