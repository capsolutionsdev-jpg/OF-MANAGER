"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forceChangePassword } from "@/lib/actions/account-actions";

export function WelcomeForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(forceChangePassword, undefined);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Mot de passe enregistré. Bienvenue !");
      router.replace("/");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-1.5">
        <Label htmlFor="next">Nouveau mot de passe</Label>
        <Input id="next" name="next" type="password" autoComplete="new-password"
          placeholder="8 caractères min., avec lettres et chiffres" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="confirm">Confirmer le mot de passe</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
        Enregistrer et accéder à mon espace
      </Button>
    </form>
  );
}
