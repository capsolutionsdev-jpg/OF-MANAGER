"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { creerVeille } from "@/lib/actions/registre-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { VEILLE_TYPES } from "@/components/qualiopi/veille-table";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

/** Ajout d'une entrée de veille (dans un dialog), au lieu d'un formulaire
 * déplié en permanence au-dessus du registre. */
export function NewVeilleDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      await creerVeille(formData);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-1.5 h-4 w-4" /> Ajouter une veille
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter une entrée de veille</DialogTitle>
          <DialogDescription>
            Sources utiles : Légifrance, Centre Inffo, France Compétences, INRS,
            branches professionnelles…
          </DialogDescription>
        </DialogHeader>

        <form action={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="type">Type de veille</Label>
            <select id="type" name="type" className={selectClass}>
              {Object.entries(VEILLE_TYPES).map(([v, t]) => (
                <option key={v} value={v}>
                  {t.label} ({t.ind})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="source">Source</Label>
            <Input id="source" name="source" required placeholder="ex. Légifrance, INRS, Centre Inffo…" />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="sujet">Sujet</Label>
            <Input id="sujet" name="sujet" required placeholder="ex. Évolution du référentiel SST 2026" />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="resume">Résumé</Label>
            <Textarea id="resume" name="resume" rows={2} />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="action">Action / mise en œuvre dans l&apos;organisme</Label>
            <Textarea
              id="action"
              name="action"
              rows={2}
              placeholder="ex. Mise à jour du programme, information des formateurs…"
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="lien">Lien (optionnel)</Label>
            <Input id="lien" name="lien" placeholder="https://…" />
          </div>

          <DialogFooter className="sm:col-span-2">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Annuler
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement…" : "Ajouter au registre"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
