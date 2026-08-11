"use client";

import { useActionState, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, UserPlus } from "lucide-react";
import { createCollaborateur, type AdminState } from "@/lib/actions/admin-actions";
import { SECTIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { POSTES } from "@/lib/postes";

export function CollaborateurForm() {
  const [state, formAction, isPending] = useActionState<
    AdminState | undefined,
    FormData
  >(createCollaborateur, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state?.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nom du collaborateur</Label>
          <Input id="name" name="name" required placeholder="Prénom NOM" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="poste">Poste / fonction</Label>
          <select id="poste" name="poste" defaultValue="assistant-administratif" className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
            {POSTES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail (identifiant de connexion)</Label>
          <Input id="email" name="email" type="email" required placeholder="collaborateur@exemple.fr" autoComplete="off" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe (à communiquer)</Label>
          <Input id="password" name="password" type="text" required placeholder="8 caractères minimum" autoComplete="off" />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Sections accessibles</p>
        <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <label key={s.key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={`perm_${s.key}`} className="h-4 w-4 rounded border" />
              {s.label}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Le tableau de bord reste toujours accessible. La gestion des comptes est réservée à l&apos;administrateur.
        </p>
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
          <span>Collaborateur créé. Communiquez-lui son e-mail et son mot de passe.</span>
        </div>
      )}

      <Button type="submit" disabled={isPending}>
        <UserPlus className="mr-2 h-4 w-4" />
        {isPending ? "Création…" : "Créer le collaborateur"}
      </Button>
    </form>
  );
}
