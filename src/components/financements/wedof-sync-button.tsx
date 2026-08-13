"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncWedof } from "@/lib/actions/financements-actions";

/** Bouton « Synchroniser » : récupère les dossiers CPF depuis Wedof. */
export function WedofSyncButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await syncWedof();
          if (r.ok) {
            toast.success(
              r.count ? `${r.count} dossier(s) synchronisé(s) depuis Wedof.` : "Aucun dossier à synchroniser.",
            );
            router.refresh();
          } else toast.error(r.error ?? "Synchronisation impossible.");
        })
      }
    >
      {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
      Synchroniser
    </Button>
  );
}
