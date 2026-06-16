"use client";

import { useState, useTransition } from "react";
import { AlertCircle, BadgeEuro } from "lucide-react";
import {
  enregistrerPaiement,
  type PaiementState,
} from "@/lib/actions/paiement-actions";
import { MODE_PAIEMENT_OPTIONS } from "@/lib/validators/paiement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function RecordPaymentDialog({
  inscriptionId,
  candidatNom,
  formation,
  restant,
  defaultMode,
  triggerLabel = "Régler",
  triggerVariant = "outline",
}: {
  inscriptionId: string;
  candidatNom: string;
  formation?: string;
  restant: number;
  defaultMode?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost";
}) {
  const [state, setState] = useState<PaiementState | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function submit(formData: FormData) {
    startTransition(async () => {
      const res = await enregistrerPaiement(inscriptionId, undefined, formData);
      setState(res);
      if (res?.ok) setOpen(false); // ferme le dialogue après enregistrement
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const knownMode = MODE_PAIEMENT_OPTIONS.includes(
    defaultMode as (typeof MODE_PAIEMENT_OPTIONS)[number],
  )
    ? defaultMode
    : "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={triggerVariant} />}>
        <BadgeEuro className="mr-1.5 h-3.5 w-3.5" />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enregistrer un règlement</DialogTitle>
          <DialogDescription>
            {candidatNom}
            {formation ? ` — ${formation}` : ""}
          </DialogDescription>
        </DialogHeader>

        <form action={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`montant-${inscriptionId}`}>Montant (€)</Label>
              <Input
                id={`montant-${inscriptionId}`}
                name="montant"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={restant > 0 ? restant : ""}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`date-${inscriptionId}`}>Date</Label>
              <Input
                id={`date-${inscriptionId}`}
                name="date"
                type="date"
                defaultValue={today}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`mode-${inscriptionId}`}>Mode</Label>
              <select
                id={`mode-${inscriptionId}`}
                name="mode"
                defaultValue={knownMode}
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="">— Choisir —</option>
                {MODE_PAIEMENT_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`reference-${inscriptionId}`}>
                Référence <span className="text-muted-foreground">(option.)</span>
              </Label>
              <Input
                id={`reference-${inscriptionId}`}
                name="reference"
                placeholder="N° virement, chèque…"
              />
            </div>
          </div>

          {state?.error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Annuler
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement…" : "Enregistrer le règlement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
