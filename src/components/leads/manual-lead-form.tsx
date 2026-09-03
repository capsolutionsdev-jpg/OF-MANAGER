"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createManualLead } from "@/lib/actions/lead-actions";
import { LEAD_CHANNELS } from "@/lib/leads";

export function ManualLeadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    const hasId =
      String(formData.get("nom") ?? "").trim() ||
      String(formData.get("email") ?? "").trim() ||
      String(formData.get("telephone") ?? "").trim();
    if (!hasId) {
      toast.error("Renseignez au moins un nom, e-mail ou téléphone.");
      return;
    }
    startTransition(async () => {
      await createManualLead(formData);
      formRef.current?.reset();
      setOpen(false);
      toast.success("Lead enregistré dans le CRM.");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" /> Saisir un lead
      </Button>
    );
  }

  return (
    <form ref={formRef} action={onSubmit} className="w-full space-y-3 rounded-xl border bg-muted/30 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="prenom">Prénom</Label>
          <Input id="prenom" name="prenom" autoFocus />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="nom">Nom</Label>
          <Input id="nom" name="nom" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="telephone">Téléphone</Label>
          <Input id="telephone" name="telephone" type="tel" inputMode="tel" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="canal">Canal d&apos;acquisition</Label>
          <select
            id="canal"
            name="canal"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={LEAD_CHANNELS[0]}
          >
            {LEAD_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="note">Note (facultatif)</Label>
        <Textarea id="note" name="note" rows={2} placeholder="Contexte de la demande…" />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement…" : "Enregistrer le lead"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
