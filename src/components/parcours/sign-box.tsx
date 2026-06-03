"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signDocuments } from "@/lib/actions/parcours-actions";

export function SignBox({
  token,
  defaultName,
}: {
  token: string;
  defaultName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(defaultName);
  const [accept, setAccept] = useState(false);

  function onSign() {
    if (!accept) {
      toast.error("Merci de cocher la case d'acceptation.");
      return;
    }
    startTransition(async () => {
      const res = await signDocuments(token, name);
      if (res.ok) {
        toast.success("Documents signés ! Une copie vous a été envoyée.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Erreur lors de la signature.");
      }
    });
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <div className="grid gap-1.5">
        <Label htmlFor="sign-name">Votre nom complet (signature)</Label>
        <Input
          id="sign-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Prénom NOM"
        />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          checked={accept}
          onChange={(e) => setAccept(e.target.checked)}
        />
        <span>
          J&apos;ai lu et j&apos;accepte l&apos;ensemble des documents ci-dessus.
          Je reconnais que ma signature électronique a la même valeur qu&apos;une
          signature manuscrite (horodatage et adresse IP enregistrés).
        </span>
      </label>
      <Button onClick={onSign} disabled={isPending} className="w-full">
        <FileSignature className="mr-2 h-4 w-4" />
        {isPending ? "Signature en cours…" : "Signer électroniquement"}
      </Button>
    </div>
  );
}
