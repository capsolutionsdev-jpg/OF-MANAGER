"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Globe, Plus, Settings } from "lucide-react";
import {
  createOrganisme,
  type ConsoleState,
} from "@/lib/actions/organisme-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FormuleSelector } from "@/components/console/formule-selector";
import type { Plan } from "@/lib/plans";

/** Normalise un texte en label de sous-domaine (miroir client de toSubdomain). */
function toSub(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function CreateOrganismeForm({ plans }: { plans?: Plan[] }) {
  const [state, formAction, isPending] = useActionState<
    ConsoleState | undefined,
    FormData
  >(createOrganisme, undefined);

  // Sous-domaine : suit le nom tant que l'éditeur ne l'a pas modifié manuellement.
  const [nom, setNom] = useState("");
  const [sousDomaine, setSousDomaine] = useState("");
  const [subTouched, setSubTouched] = useState(false);
  const effectiveSub = subTouched ? sousDomaine : toSub(nom);

  if (state?.ok && state.id) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2 rounded-md bg-success/10 p-3 text-sm text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Organisme créé. Communiquez ses identifiants au gérant, puis configurez son instance.
          </div>
          {state.sousDomaine && (
            <div className="flex items-center gap-2 rounded-md border p-3 text-sm">
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
              Instance accessible sur{" "}
              <span className="font-medium">{state.sousDomaine}.ofmanager.fr</span>
            </div>
          )}
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
            <Input
              id="nom"
              name="nom"
              required
              placeholder="Ex. Mon Centre de Formation"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="raisonSociale">Raison sociale</Label>
            <Input id="raisonSociale" name="raisonSociale" placeholder="SARL / SAS…" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sousDomaine">
              <Globe className="mr-1 inline h-3.5 w-3.5" /> Adresse de l&apos;instance (sous-domaine)
            </Label>
            <div className="flex items-stretch overflow-hidden rounded-md border">
              <Input
                id="sousDomaine"
                name="sousDomaine"
                className="border-0 focus-visible:ring-0"
                placeholder="auto depuis le nom"
                value={effectiveSub}
                onChange={(e) => {
                  setSubTouched(true);
                  setSousDomaine(toSub(e.target.value));
                }}
              />
              <span className="flex items-center bg-muted px-3 text-sm text-muted-foreground">
                .ofmanager.fr
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Généré automatiquement depuis le nom — modifiable. L&apos;OF sera accessible sur{" "}
              <span className="font-medium">{effectiveSub || "votre-of"}.ofmanager.fr</span>.
            </p>
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
            <FormuleSelector defaultFormule="MEDIUM" plans={plans} />
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
