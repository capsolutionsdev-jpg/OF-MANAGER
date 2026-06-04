"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendProspectIntakeLink } from "@/lib/actions/prospect-actions";

export function SendProspectLinkButton({
  candidatId,
  sent,
}: {
  candidatId: string;
  sent: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const res = await sendProspectIntakeLink(candidatId);
      if (!res.ok) {
        toast.error(res.error ?? "Erreur.");
        return;
      }
      toast.success(res.error ?? "Lien d'inscription envoyé au prospect.");
      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={isPending}
      title="Envoyer au prospect le lien de sa fiche d'inscription"
    >
      <Send className="mr-1.5 h-3.5 w-3.5" />
      {isPending ? "Envoi…" : sent ? "Renvoyer le lien" : "Lien d'inscription"}
    </Button>
  );
}
