"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markInscriptionSignedOnSite } from "@/lib/actions/document-actions";

export function SignedOnSiteButton({ inscriptionId }: { inscriptionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (!confirm("Marquer les documents comme signés sur place ?")) return;
    startTransition(async () => {
      const r = await markInscriptionSignedOnSite(inscriptionId);
      if (r.ok) {
        toast.success("Marqué comme signé sur place.");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <Button size="sm" variant="outline" onClick={onClick} disabled={isPending}>
      <PenLine className="mr-1.5 h-3.5 w-3.5" />
      {isPending ? "…" : "Signé sur place"}
    </Button>
  );
}
