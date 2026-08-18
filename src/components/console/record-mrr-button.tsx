"use client";

import { useTransition } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { recordMrrSnapshotAction } from "@/lib/actions/analytics-actions";

/** Enregistre le point MRR du mois courant (au cas où le cron mensuel n'est pas encore passé). */
export function RecordMrrButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() =>
        start(async () => {
          const res = await recordMrrSnapshotAction();
          toast[res.ok ? "success" : "error"](
            res.ok ? `Point MRR enregistré (${res.mois}).` : res.error ?? "Échec.",
          );
        })
      }
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
      Enregistrer le point du mois
    </button>
  );
}
