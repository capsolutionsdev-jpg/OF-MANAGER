"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prepareEmargementSignatures } from "@/lib/actions/emargement-signature-actions";

export function PrepareSignaturesButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const res = await prepareEmargementSignatures(sessionId);
      if (!res.ok) {
        toast.error(res.error ?? "Erreur.");
        return;
      }
      toast.success(
        res.created > 0
          ? `${res.created} lien(s) de signature préparé(s). Ils seront envoyés chaque demi-journée (ou via « Exécuter les automatismes »).`
          : "Les signatures électroniques sont déjà prêtes.",
      );
      router.refresh();
    });
  }

  return (
    <Button variant="outline" onClick={onClick} disabled={isPending}>
      <QrCode className="mr-2 h-4 w-4" />
      {isPending ? "Préparation…" : "Préparer les signatures électroniques"}
    </Button>
  );
}
