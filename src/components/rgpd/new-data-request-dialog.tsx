"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createDataRequest } from "@/lib/actions/rgpd-actions";
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
import { TYPE_LABELS } from "./labels";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

/** Enregistrement d'une demande d'exercice des droits (dans un dialog), au lieu
 * d'un formulaire déplié en permanence au-dessus de la table. */
export function NewDataRequestDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      await createDataRequest(formData);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-1.5 h-4 w-4" /> Nouvelle demande
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle demande d&apos;exercice des droits</DialogTitle>
          <DialogDescription>
            Enregistrez une demande d&apos;accès, de portabilité ou de suppression
            reçue d&apos;une personne concernée.
          </DialogDescription>
        </DialogHeader>

        <form action={submit} className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="subjectEmail">Email du demandeur</Label>
            <Input
              id="subjectEmail"
              name="subjectEmail"
              type="email"
              placeholder="personne@example.com"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="type">Type de demande</Label>
            <select id="type" name="type" className={selectClass}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Annuler
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement…" : "Enregistrer la demande"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
