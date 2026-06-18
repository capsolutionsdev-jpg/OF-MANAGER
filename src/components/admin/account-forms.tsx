"use client";

import { useActionState, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, UserPlus } from "lucide-react";
import { createCandidatWithAccount, type AccountState } from "@/lib/actions/apprenant-actions";
import { createFormateurWithAccount } from "@/lib/actions/formateur-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function genPwd(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function Feedback({ state, okMsg }: { state: AccountState | undefined; okMsg: string }) {
  if (state?.error)
    return (
      <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" /> <span>{state.error}</span>
      </div>
    );
  if (state?.ok)
    return (
      <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600">
        <CheckCircle2 className="h-4 w-4 shrink-0" /> <span>{okMsg}</span>
      </div>
    );
  return null;
}

export function CandidatAccountForm() {
  const [state, formAction, isPending] = useActionState<AccountState | undefined, FormData>(
    createCandidatWithAccount,
    undefined,
  );
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state?.ok]);

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="c-prenom">Prénom *</Label>
          <Input id="c-prenom" name="prenom" required placeholder="Prénom" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-nom">Nom *</Label>
          <Input id="c-nom" name="nom" required placeholder="NOM" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-email">E-mail (identifiant) *</Label>
          <Input id="c-email" name="email" type="email" required autoComplete="off" placeholder="candidat@exemple.fr" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-tel">Téléphone</Label>
          <Input id="c-tel" name="telephone" placeholder="06…" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="c-pwd">Mot de passe provisoire *</Label>
          <Input id="c-pwd" name="password" type="text" required autoComplete="off" defaultValue={genPwd("CAP")} placeholder="6 caractères minimum" />
        </div>
      </div>
      <Feedback state={state} okMsg="Candidat et accès apprenant créés. Communiquez l'e-mail et le mot de passe." />
      <Button type="submit" disabled={isPending}>
        <UserPlus className="mr-2 h-4 w-4" /> {isPending ? "Création…" : "Créer le candidat + son accès"}
      </Button>
    </form>
  );
}

export function FormateurAccountForm() {
  const [state, formAction, isPending] = useActionState<AccountState | undefined, FormData>(
    createFormateurWithAccount,
    undefined,
  );
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state?.ok]);

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="f-prenom">Prénom *</Label>
          <Input id="f-prenom" name="prenom" required placeholder="Prénom" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-nom">Nom *</Label>
          <Input id="f-nom" name="nom" required placeholder="NOM" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-email">E-mail (identifiant) *</Label>
          <Input id="f-email" name="email" type="email" required autoComplete="off" placeholder="formateur@exemple.fr" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-tel">Téléphone</Label>
          <Input id="f-tel" name="telephone" placeholder="06…" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-spec">Spécialités</Label>
          <Input id="f-spec" name="specialites" placeholder="Sécurité, SST…" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-tarif">Tarif journalier (€ HT)</Label>
          <Input id="f-tarif" name="tarifJournalier" type="number" step="0.01" placeholder="350" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="f-pwd">Mot de passe provisoire *</Label>
          <Input id="f-pwd" name="password" type="text" required autoComplete="off" defaultValue={genPwd("FORM")} placeholder="6 caractères minimum" />
        </div>
      </div>
      <Feedback state={state} okMsg="Formateur et accès créés. Communiquez l'e-mail et le mot de passe." />
      <Button type="submit" disabled={isPending}>
        <UserPlus className="mr-2 h-4 w-4" /> {isPending ? "Création…" : "Créer le formateur + son accès"}
      </Button>
    </form>
  );
}
