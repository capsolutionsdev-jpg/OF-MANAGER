"use client";

import { useActionState } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { requestPasswordReset } from "@/lib/actions/password-reset-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, undefined);

  // Réponse NEUTRE (anti-énumération) : même message quelle que soit l'issue réelle.
  if (state?.done) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-foreground">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <span>{state.message}</span>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Adresse e-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="vous@organisme.fr"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        <Mail className="mr-2 h-4 w-4" />
        {isPending ? "Envoi…" : "Envoyer le lien de réinitialisation"}
      </Button>
    </form>
  );
}
