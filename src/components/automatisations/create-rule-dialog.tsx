"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createWorkflowRule } from "@/lib/actions/email-actions";
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
import { TRIGGER_LABELS, ACTION_LABELS } from "./labels";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

/** Création d'une règle d'automatisation à la demande (dans un dialog), au lieu
 * d'un formulaire déplié en permanence sous la table. */
export function CreateRuleDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      await createWorkflowRule(formData);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-1.5 h-4 w-4" /> Règle
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle règle d&apos;automatisation</DialogTitle>
          <DialogDescription>
            Associez un déclencheur à une action e-mail, avec un décalage
            optionnel (en jours).
          </DialogDescription>
        </DialogHeader>

        <form action={submit} className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="nom">Nom de la règle</Label>
            <Input id="nom" name="nom" placeholder="Convocation J-7" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="trigger">Déclencheur</Label>
              <select id="trigger" name="trigger" className={selectClass}>
                {Object.entries(TRIGGER_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="action">Action</Label>
              <select id="action" name="action" className={selectClass}>
                {Object.entries(ACTION_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-1.5 sm:max-w-[12rem]">
            <Label htmlFor="offsetDays">Décalage (jours)</Label>
            <Input id="offsetDays" name="offsetDays" type="number" defaultValue={0} />
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Annuler
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Ajout…" : "Ajouter la règle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
