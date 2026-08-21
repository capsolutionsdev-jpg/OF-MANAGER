"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, CalendarClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  confirmerDemandeInscription,
  refuserDemandeInscription,
  proposerAutreDate,
} from "@/lib/actions/demande-inscription-actions";

type SessionOption = { id: string; label: string };

const OPCO_LIST = [
  "AKTO",
  "OPCO Mobilités",
  "OPCO EP",
  "OPCO 2i",
  "Atlas",
  "Uniformation",
  "AFDAS",
  "Constructys",
  "OCAPIAT",
  "OPCO Santé",
  "OPCO Commerce",
  "Autre OPCO",
];

export function DemandeActions({
  demandeId,
  sessions,
  montantSuggere,
  nbSalaries,
  financementType,
  opcoActuel,
}: {
  demandeId: string;
  sessions: SessionOption[];
  /** Prix suggéré PAR CANDIDAT (tarif de la formation). */
  montantSuggere?: number;
  nbSalaries: number;
  financementType?: string | null;
  opcoActuel?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"idle" | "confirm" | "refuse" | "propose">("idle");
  const [prixCandidat, setPrixCandidat] = useState(
    montantSuggere != null && montantSuggere > 0 ? String(montantSuggere) : "",
  );
  const [opco, setOpco] = useState(opcoActuel ?? "");
  const [motif, setMotif] = useState("");
  const [sessionProposeeId, setSessionProposeeId] = useState("");

  const isOpco = financementType === "OPCO";
  const prixNum = prixCandidat.trim() ? Number(prixCandidat.replace(",", ".")) : NaN;
  const totalPreview = Number.isFinite(prixNum) && prixNum >= 0 ? Math.round(prixNum * nbSalaries * 100) / 100 : null;

  function confirmer() {
    const prixParCandidat = Number.isFinite(prixNum) && prixNum >= 0 ? prixNum : undefined;
    start(async () => {
      const res = await confirmerDemandeInscription(demandeId, {
        prixParCandidat,
        opco: isOpco ? opco.trim() || undefined : undefined,
      });
      if (!res.ok) {
        toast.error(res.error ?? "La confirmation a échoué.");
        return;
      }
      toast.success("Demande confirmée — convention générée.");
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

  if (mode === "confirm") {
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor={`prix-${demandeId}`} className="text-xs">
            Prix par candidat (€ net de taxe)
          </Label>
          <Input
            id={`prix-${demandeId}`}
            value={prixCandidat}
            onChange={(e) => setPrixCandidat(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className="h-8 w-56"
          />
          <p className="text-xs text-muted-foreground">
            {nbSalaries} salarié{nbSalaries > 1 ? "s" : ""}
            {totalPreview != null ? ` · total : ${totalPreview} €` : ""}
          </p>
        </div>
        {isOpco && (
          <div className="space-y-1">
            <Label htmlFor={`opco-${demandeId}`} className="text-xs">
              OPCO (financeur)
            </Label>
            <select
              id={`opco-${demandeId}`}
              value={opco}
              onChange={(e) => setOpco(e.target.value)}
              className="h-8 w-56 rounded-md border bg-card px-2 text-sm"
            >
              <option value="">— Choisir l&apos;OPCO —</option>
              {OPCO_LIST.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setMode("idle")} disabled={pending}>
            Annuler
          </Button>
          <Button size="sm" onClick={confirmer} disabled={pending}>
            {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Confirmer &amp; générer la convention
          </Button>
        </div>
      </div>
    );
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
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setMode("idle");
              setSessionProposeeId("");
            }}
            disabled={pending}
          >
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
      <Button size="sm" onClick={() => setMode("confirm")} disabled={pending}>
        <Check className="mr-1.5 h-4 w-4" />
        Confirmer
      </Button>
    </div>
  );
}
