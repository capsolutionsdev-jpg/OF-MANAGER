"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCandidatProfil } from "@/lib/actions/candidat-portal-actions";

type Coords = { telephone: string; adresse: string; codePostal: string; ville: string };

export function ProfilForm({ defaults }: { defaults: Coords }) {
  const router = useRouter();
  const [v, setV] = useState<Coords>(defaults);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const r = await updateCandidatProfil(v);
      if (r.ok) { toast.success("Profil mis à jour."); router.refresh(); }
      else toast.error(r.error);
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-1.5">
        <Label htmlFor="telephone">Téléphone</Label>
        <Input id="telephone" value={v.telephone} onChange={(e) => setV({ ...v, telephone: e.target.value })} />
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="adresse">Adresse</Label>
        <Input id="adresse" value={v.adresse} onChange={(e) => setV({ ...v, adresse: e.target.value })} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="cp">Code postal</Label>
        <Input id="cp" value={v.codePostal} onChange={(e) => setV({ ...v, codePostal: e.target.value })} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ville">Ville</Label>
        <Input id="ville" value={v.ville} onChange={(e) => setV({ ...v, ville: e.target.value })} />
      </div>
      <div className="sm:col-span-2">
        <Button onClick={save} disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
