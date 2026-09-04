"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setAllPresent } from "@/lib/actions/emargement-actions";

/** Marque tous les participants d'une séance présents en un clic (A10-006). */
export function MarkAllPresentButton({ seanceId }: { seanceId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await setAllPresent(seanceId);
          if (r.ok) {
            toast.success(
              r.count > 0
                ? `${r.count} participant(s) marqué(s) présent(s).`
                : "Aucun participant à marquer.",
            );
            router.refresh();
          } else {
            toast.error("Action impossible.");
          }
        })
      }
    >
      <UserCheck className="mr-2 h-4 w-4" />
      {pending ? "…" : "Tous présents"}
    </Button>
  );
}
