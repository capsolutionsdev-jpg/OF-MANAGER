"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, CalendarClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  confirmerDemandeInscription,
  refuserDemandeInscription,
  proposerAutreDate,
} from "@/lib/actions/demande-inscription-actions";

type SessionOption = { id: string; label: string };

export function DemandeActions({
  demandeId,
  sessions,
}: {
  demandeId: string;
  sessions: SessionOption[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"idle" | "refuse" | "propose">("idle");
  const [motif, setMotif] = useState("");
  const [sessionProposeeId, setSessionProposeeId] = useState("");

  function confirmer() {
    start(async () => {
      const res = await confirmerDemandeInscription(demandeId);
      if (!res.ok) {
        toast.error(res.error ?? "La confirmation a échoué.");
        return;
      }
      toast.success("Demande confirmée — convention et inscriptions créées.");
      if (res.warning) toast.warning(res.warning);
      router.refresh();
    });
  }

  function refuser() {
    start(async () => {
      const res = await refuserDemandeInscription(demandeId, motif);
      if (!res.ok) {
        toast.error(res.error ?? "Le refus a échoué.");
        return;
      }
      toast.success("Demande refusée.");
      setMode("idle");
      setMotif("");
      router.refresh();
    });
  }

  function proposer() {
    if (!sessionProposeeId) {
      toast.error("Choisissez une session à proposer.");
      return;
    }
    start(async () => {
      const res = await proposerAutreDate(demandeId, sessionProposeeId);
      if (!res.ok) {
        toast.error(res.error ?? "La proposition a échoué.");
        return;
      }
      toast.success("Autre date proposée au client.");
      setMode("idle");
      setSessionProposeeId("");
      router.refresh();
    });
  }

  if (mode === "refuse") {
    return (
      <div className="flex flex-col items-end gap-2">
        <input
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Motif (facultatif)"
          className="h-8 w-56 rounded-md border bg-card px-2 text-sm"
        />
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setMode("idle")} disabled={pending}>
            Annuler
          </Button>
          <Button size="sm" variant="destructive" onClick={refuser} disabled={pending}>
            {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Confirmer le refus
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "propose") {
    return (
      <div className="flex flex-col items-end gap-2">
        <select
          value={sessionProposeeId}
          onChange={(e) => setSessionProposeeId(e.target.value)}
          className="h-8 w-64 max-w-full rounded-md border bg-card px-2 text-sm"
        >
          <option value="">— Choisir une autre session —</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setMode("idle")} disabled={pending}>
            Annuler
          </Button>
          <Button size="sm" onClick={proposer} disabled={pending}>
            {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Proposer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-wrap justify-end gap-2">
      <Button size="sm" variant="outline" onClick={() => setMode("propose")} disabled={pending}>
        <CalendarClock className="mr-1.5 h-4 w-4" />
        Autre date
      </Button>
      <Button size="sm" variant="outline" onClick={() => setMode("refuse")} disabled={pending}>
        <X className="mr-1.5 h-4 w-4" />
        Refuser
      </Button>
      <Button size="sm" onClick={confirmer} disabled={pending}>
        {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
        Confirmer
      </Button>
    </div>
  );
}
