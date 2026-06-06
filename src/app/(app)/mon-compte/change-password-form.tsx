"use client";

import { useActionState, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { changePassword, type ChangePasswordState } from "@/lib/actions/account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState<
    ChangePasswordState | undefined,
    FormData
  >(changePassword, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state?.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current">Mot de passe actuel</Label>
        <Input
          id="current"
          name="current"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="next">Nouveau mot de passe</Label>
        <Input
          id="next"
          name="next"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Au moins 8 caractères, lettres et chiffres"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">Confirmer le nouveau mot de passe</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
        />
      </div>

      {state?.error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state?.ok && (
        <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Mot de passe modifié avec succès.</span>
        </div>
      )}

      <Button type="submit" disabled={isPending}>
        <KeyRound className="mr-2 h-4 w-4" />
        {isPending ? "Modification…" : "Changer le mot de passe"}
      </Button>
    </form>
  );
}
