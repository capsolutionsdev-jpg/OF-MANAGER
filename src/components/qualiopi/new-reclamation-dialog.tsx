"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { creerReclamation } from "@/lib/actions/registre-actions";
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

export const ORIGINES: Record<string, string> = {
  STAGIAIRE: "Stagiaire",
  FORMATEUR: "Formateur",
  ENTREPRISE: "Entreprise cliente",
  FINANCEUR: "Financeur (OPCO/CPF…)",
  AUTRE: "Autre",
};

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

/** Enregistrement d'une réclamation (dans un dialog), au lieu d'un formulaire
 * déplié en permanence au-dessus du registre. */
export function NewReclamationDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      await creerReclamation(formData);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-1.5 h-4 w-4" /> Nouvelle réclamation
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enregistrer une réclamation</DialogTitle>
          <DialogDescription>
            Toute réclamation reçue (e-mail, courrier, oral formalisé) est
            enregistrée ici, datée et identifiée.
          </DialogDescription>
        </DialogHeader>

        <form action={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="declarant">Réclamant (nom)</Label>
            <Input id="declarant" name="declarant" required placeholder="Nom du réclamant" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="contact">Contact (e-mail / téléphone)</Label>
            <Input id="contact" name="contact" placeholder="contact@exemple.fr" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="origine">Origine</Label>
            <select id="origine" name="origine" className={selectClass}>
              {Object.entries(ORIGINES).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="gravite">Gravité</Label>
            <select id="gravite" name="gravite" className={selectClass}>
              <option value="1">Mineure</option>
              <option value="2">Modérée</option>
              <option value="3">Majeure</option>
            </select>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="formation">Formation / session concernée</Label>
            <Input id="formation" name="formation" placeholder="ex. SST — session de janvier" />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="objet">Objet</Label>
            <Input id="objet" name="objet" required placeholder="Objet de la réclamation" />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="description">Description de l&apos;écart</Label>
            <Textarea
              id="description"
              name="description"
              required
              rows={3}
              placeholder="Description détaillée de l'aléa, l'anomalie ou la réclamation…"
            />
          </div>

          <DialogFooter className="sm:col-span-2">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Annuler
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement…" : "Enregistrer au registre"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
