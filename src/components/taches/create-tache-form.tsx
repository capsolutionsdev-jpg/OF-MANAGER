"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTache } from "@/lib/actions/tache-actions";

export type CandidatOption = { id: string; label: string };

export function CreateTacheForm({ candidats }: { candidats: CandidatOption[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    if (!String(formData.get("titre") ?? "").trim()) {
      toast.error("Indiquez un intitulé.");
      return;
    }
    startTransition(async () => {
      await createTache(formData);
      formRef.current?.reset();
      setOpen(false);
      toast.success("Tâche ajoutée.");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" /> Nouvelle tâche
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={onSubmit}
      className="w-full space-y-3 rounded-xl border bg-muted/30 p-4"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="titre">Intitulé</Label>
        <Input id="titre" name="titre" placeholder="Ex. Relancer M. Dupont (devis)" autoFocus />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="dueDate">Échéance</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="candidatId">Lié à un prospect / candidat</Label>
          <select
            id="candidatId"
            name="candidatId"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue=""
          >
            <option value="">— Aucun —</option>
            {candidats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="description">Note (facultatif)</Label>
        <Textarea id="description" name="description" rows={2} placeholder="Détails…" />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Ajout…" : "Ajouter la tâche"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
