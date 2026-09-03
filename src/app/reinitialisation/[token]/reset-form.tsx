"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmPasswordReset } from "@/lib/actions/password-reset-actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await confirmPasswordReset(token, next, confirm);
          if (r.ok) {
            toast.success("Mot de passe réinitialisé. Vous pouvez vous connecter.");
            router.push("/login?reset=1");
          } else {
            toast.error(r.error ?? "Une erreur est survenue.");
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="next">Nouveau mot de passe</Label>
        <Input
          id="next"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
          placeholder="8 caractères minimum"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirmer le mot de passe</Label>
        <Input
          id="confirm"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
          placeholder="Retapez le mot de passe"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Validation…" : "Réinitialiser mon mot de passe"}
      </Button>
    </form>
  );
}
