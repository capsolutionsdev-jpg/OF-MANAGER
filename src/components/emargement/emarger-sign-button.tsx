"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signEmargement } from "@/lib/actions/emargement-signature-actions";

export function EmargerSignButton({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const res = await signEmargement(token);
      if (res.ok) {
        toast.success("Présence signée. Merci !");
        router.refresh();
      } else {
        toast.error(res.error ?? "Erreur.");
      }
    });
  }

  return (
    <Button onClick={onClick} disabled={isPending} className="w-full">
      <PenLine className="mr-2 h-4 w-4" />
      {isPending ? "Signature…" : "Signer ma présence"}
    </Button>
  );
}
