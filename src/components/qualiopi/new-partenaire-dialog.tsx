"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { creerPartenaire } from "@/lib/actions/registre-actions";
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

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

/** Ajout d'un partenaire (dans un dialog), au lieu d'un formulaire déplié en
 * permanence au-dessus de la table. */
export function NewPartenaireDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      await creerPartenaire(formData);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-1.5 h-4 w-4" /> Ajouter un partenaire
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un partenaire</DialogTitle>
          <DialogDescription>
            Conseil : renseignez au minimum les partenaires handicap de votre
            département (Agefiph, Cap emploi, MDPH) et vos partenaires
            emploi/entreprises.
          </DialogDescription>
        </DialogHeader>

        <form action={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" name="nom" required placeholder="ex. Cap emploi 95" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="categorie">Catégorie</Label>
            <select id="categorie" name="categorie" className={selectClass}>
              <option>Handicap</option>
              <option>Emploi / insertion</option>
              <option>Entreprise</option>
              <option>Institutionnel / financeur</option>
              <option>Branche professionnelle</option>
              <option>Autre</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="contact">Contact (nom)</Label>
            <Input id="contact" name="contact" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="telephone">Téléphone</Label>
            <Input id="telephone" name="telephone" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="objet">Nature du partenariat</Label>
            <Input id="objet" name="objet" placeholder="ex. Accompagnement des stagiaires en situation de handicap" />
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
