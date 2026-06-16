"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Plus, Settings } from "lucide-react";
import {
  createOrganisme,
  type ConsoleState,
} from "@/lib/actions/organisme-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FormuleSelector } from "@/components/console/formule-selector";

export function CreateOrganismeForm() {
  const [state, formAction, isPending] = useActionState<
    ConsoleState | undefined,
    FormData
  >(createOrganisme, undefined);

  if (state?.ok && state.id) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Organisme créé. Communiquez ses identifiants au gérant, puis configurez son instance.
          </div>
          <Button render={<Link href={`/console/${state.id}`} />}>
            <Settings className="mr-2 h-4 w-4" /> Configurer l&apos;organisme
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form action={formAction} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="nom">Nom commercial *</Label>
            <Input id="nom" name="nom" required placeholder="Ex. Mon Centre de Formation" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="raisonSociale">Raison sociale</Label>
            <Input id="raisonSociale" name="raisonSociale" placeholder="SARL / SAS…" />
          </div>

          <div className="rounded-lg border p-4">
            <p className="mb-3 text-sm font-medium">Compte gérant (administrateur de l&apos;OF)</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="gerantName">Nom du gérant</Label>
                <Input id="gerantName" name="gerantName" placeholder="Prénom NOM" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gerantEmail">E-mail (identifiant) *</Label>
                <Input id="gerantEmail" name="gerantEmail" type="email" required autoComplete="off" placeholder="gerant@of.fr" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="gerantPassword">Mot de passe provisoire *</Label>
                <Input id="gerantPassword" name="gerantPassword" type="text" required autoComplete="off" placeholder="8 caractères minimum" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <FormuleSelector defaultFormule="MEDIUM" />
          </div>

          {state?.error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <Button type="submit" disabled={isPending}>
            <Plus className="mr-2 h-4 w-4" />
            {isPending ? "Création…" : "Créer l'organisme"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
