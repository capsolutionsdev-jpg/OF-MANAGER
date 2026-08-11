"use client";

import { useState } from "react";
import { ChevronDown, KeyRound, Power, Trash2, Save } from "lucide-react";
import { SECTIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  updateCollaborateur,
  resetCollaborateurPassword,
  toggleCollaborateurActive,
  deleteCollaborateur,
} from "@/lib/actions/admin-actions";
import { POSTES, posteValueFromFonction } from "@/lib/postes";

type Collab = {
  id: string;
  name: string;
  email: string;
  role: string;
  fonction: string | null;
  isActive: boolean;
  permissions: string[];
};

export function CollaborateurRow({ c }: { c: Collab }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-left"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          <span className="font-medium">{c.name}</span>
          <span className="text-xs text-muted-foreground">{c.email}</span>
        </button>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {c.fonction ?? (c.role === "RESPONSABLE_FORMATION" ? "Responsable" : "Assistant")}
          </Badge>
          {c.isActive ? (
            <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Actif</Badge>
          ) : (
            <Badge variant="secondary" className="bg-muted text-muted-foreground">Désactivé</Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {c.permissions.length} section{c.permissions.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t p-4">
          {/* Sections + rôle */}
          <form action={updateCollaborateur} className="space-y-3">
            <input type="hidden" name="id" value={c.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Nom</label>
                <Input name="name" defaultValue={c.name} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Poste / fonction</label>
                <select name="poste" defaultValue={posteValueFromFonction(c.fonction, c.role)} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                  {POSTES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium">Sections accessibles</p>
              <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-3">
                {SECTIONS.map((s) => (
                  <label key={s.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={`perm_${s.key}`}
                      defaultChecked={c.permissions.includes(s.key)}
                      className="h-4 w-4 rounded border"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" size="sm">
              <Save className="mr-1 h-4 w-4" /> Enregistrer les droits
            </Button>
          </form>

          <div className="flex flex-wrap items-end gap-4 border-t pt-4">
            {/* Réinitialiser mot de passe */}
            <form action={resetCollaborateurPassword} className="flex items-end gap-2">
              <input type="hidden" name="id" value={c.id} />
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Nouveau mot de passe</label>
                <Input name="password" type="text" placeholder="8 caractères min." className="w-48" />
              </div>
              <Button type="submit" size="sm" variant="outline">
                <KeyRound className="mr-1 h-4 w-4" /> Réinitialiser
              </Button>
            </form>

            {/* Activer / désactiver */}
            <form action={toggleCollaborateurActive}>
              <input type="hidden" name="id" value={c.id} />
              <Button type="submit" size="sm" variant="outline">
                <Power className="mr-1 h-4 w-4" /> {c.isActive ? "Désactiver" : "Réactiver"}
              </Button>
            </form>

            {/* Supprimer */}
            <form action={deleteCollaborateur}>
              <input type="hidden" name="id" value={c.id} />
              <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                <Trash2 className="mr-1 h-4 w-4" /> Supprimer
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
