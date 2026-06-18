"use client";

import { useActionState, useEffect, useRef } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { createSalle, type SalleState } from "@/lib/actions/salle-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateSalleForm() {
  const [state, formAction, isPending] = useActionState<
    SalleState | undefined,
    FormData
  >(createSalle, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state?.ok]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end"
    >
      <div className="space-y-1.5">
        <Label htmlFor="nom">Nom *</Label>
        <Input id="nom" name="nom" required placeholder="Salle A" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="capacite">Capacité</Label>
        <Input id="capacite" name="capacite" type="number" min="0" placeholder="12" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lieu">Lieu</Label>
        <Input id="lieu" name="lieu" placeholder="1er étage" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="equipements">Équipements</Label>
        <Input id="equipements" name="equipements" placeholder="Vidéoprojecteur, tableau…" />
      </div>
      <div className="flex items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="couleur">Couleur</Label>
          <Input id="couleur" name="couleur" type="color" defaultValue="#2C53C0" className="h-9 w-12 p-1" />
        </div>
        <Button type="submit" disabled={isPending}>
          <Plus className="mr-1.5 h-4 w-4" />
          {isPending ? "…" : "Ajouter"}
        </Button>
      </div>
      {state?.error && (
        <div className="flex items-center gap-2 text-sm text-destructive sm:col-span-2 lg:col-span-6">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}
    </form>
  );
}
