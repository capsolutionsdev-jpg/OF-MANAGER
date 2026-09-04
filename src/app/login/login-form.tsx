"use client";

import { useActionState } from "react";
import { AlertCircle, LogIn } from "lucide-react";
import Link from "next/link";
import { authenticate } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="vous@organisme.fr"
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </div>

      <div className="-mt-1 text-right">
        <Link
          href="/mot-de-passe-oublie"
          className="text-xs text-white/60 transition hover:text-white hover:underline"
        >
          Mot de passe oublié ?
        </Link>
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">Code 2FA <span className="text-muted-foreground">(si activé)</span></Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          pattern="[0-9]*"
          maxLength={6}
        />
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        <LogIn className="mr-2 h-4 w-4" />
        {isPending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
