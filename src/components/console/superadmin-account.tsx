"use client";

import { useActionState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Save, KeyRound, UserPlus, Loader2, Power } from "lucide-react";
import {
  updateSuperadminProfile,
  changeSuperadminPassword,
  createSuperadmin,
  toggleSuperadminActive,
  type AccountState,
} from "@/lib/actions/superadmin-account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Editor = { id: string; name: string; email: string; isActive: boolean };

function Notice({ state, okText }: { state: AccountState | undefined; okText: string }) {
  if (state?.error)
    return (
      <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2.5 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
      </div>
    );
  if (state?.ok)
    return (
      <div className="flex items-center gap-2 rounded-md bg-success/10 p-2.5 text-sm text-success">
        <CheckCircle2 className="h-4 w-4 shrink-0" /> {okText}
      </div>
    );
  return null;
}

export function ProfileCard({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState<AccountState | undefined, FormData>(updateSuperadminProfile, undefined);
  return (
    <Card>
      <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">Profil</CardTitle></CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="name">Nom</Label><Input id="name" name="name" defaultValue={name} /></div>
            <div className="space-y-1.5"><Label htmlFor="email">E-mail (identifiant)</Label><Input id="email" name="email" type="email" defaultValue={email} /></div>
          </div>
          <Notice state={state} okText="Profil mis à jour." />
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Enregistrer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function PasswordCard() {
  const [state, action, pending] = useActionState<AccountState | undefined, FormData>(changeSuperadminPassword, undefined);
  return (
    <Card>
      <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">Mot de passe</CardTitle></CardHeader>
      <CardContent>
        <form action={action} className="space-y-3" key={state?.ok ? "ok" : "form"}>
          <div className="space-y-1.5"><Label htmlFor="current">Mot de passe actuel</Label><Input id="current" name="current" type="password" autoComplete="current-password" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="next">Nouveau mot de passe</Label><Input id="next" name="next" type="password" autoComplete="new-password" placeholder="8 caractères min." /></div>
            <div className="space-y-1.5"><Label htmlFor="confirm">Confirmer</Label><Input id="confirm" name="confirm" type="password" autoComplete="new-password" /></div>
          </div>
          <Notice state={state} okText="Mot de passe modifié." />
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />} Changer le mot de passe
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function TeamCard({ editors, currentId }: { editors: Editor[]; currentId: string }) {
  const [state, action, pending] = useActionState<AccountState | undefined, FormData>(createSuperadmin, undefined);
  const [toggling, startToggle] = useTransition();
  return (
    <Card>
      <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">Équipe éditeur (comptes SUPERADMIN)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          {editors.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2.5 text-sm">
              <span className="font-medium">{e.name}</span>
              <span className="text-muted-foreground">{e.email}</span>
              {e.id === currentId && <Badge variant="secondary">vous</Badge>}
              {!e.isActive && <Badge variant="destructive">inactif</Badge>}
              {e.id !== currentId && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-7 gap-1.5 px-2 text-xs"
                  disabled={toggling}
                  onClick={() => startToggle(() => toggleSuperadminActive(e.id))}
                >
                  <Power className="h-3.5 w-3.5" /> {e.isActive ? "Désactiver" : "Réactiver"}
                </Button>
              )}
            </div>
          ))}
        </div>

        <form action={action} className="space-y-3 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ajouter un éditeur</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5"><Label htmlFor="t-name">Nom</Label><Input id="t-name" name="name" placeholder="Prénom NOM" /></div>
            <div className="space-y-1.5"><Label htmlFor="t-email">E-mail</Label><Input id="t-email" name="email" type="email" autoComplete="off" placeholder="editeur@ofmanager.info" /></div>
            <div className="space-y-1.5"><Label htmlFor="t-password">Mot de passe</Label><Input id="t-password" name="password" type="text" autoComplete="off" placeholder="8 caractères min." /></div>
          </div>
          <Notice state={state} okText="Compte éditeur créé." />
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />} Créer le compte éditeur
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
