"use client";

import { useActionState, useEffect, useState } from "react";
import { UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import { createLeadManuel, type CreateLeadState } from "@/lib/actions/console-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { STATUT_OPTIONS } from "@/components/console/lead-statut";

const field = "h-9 text-sm";
const labelCls = "mb-1 block text-xs font-medium text-muted-foreground";
const selectCls = "h-9 w-full rounded-lg border bg-transparent px-2 text-sm";

/** Bouton + boîte de dialogue « Ajouter un prospect » (prospection manuelle). */
export function LeadManualAdd() {
  const [open, setOpen] = useState(false);
  // Instance du formulaire : incrémentée à chaque ouverture pour remonter le
  // composant interne et réinitialiser son useActionState (sinon l'écran de
  // succès resterait affiché à la réouverture).
  const [instance, setInstance] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setInstance((n) => n + 1);
        setOpen(o);
      }}
    >
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <UserPlus className="h-4 w-4" /> Ajouter un prospect
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <AddForm key={instance} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AddForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState<CreateLeadState | undefined, FormData>(createLeadManuel, undefined);

  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(onDone, 800);
      return () => clearTimeout(t);
    }
  }, [state?.ok, onDone]);

  if (state?.ok) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Prospect ajouté</DialogTitle>
          <DialogDescription>Il apparaît maintenant dans la page Prospects.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          <p className="text-sm font-medium">C&apos;est enregistré.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Ajouter un prospect</DialogTitle>
        <DialogDescription>Reprend la trame de vos fichiers de prospection. Seul le nom de l&apos;organisme est obligatoire.</DialogDescription>
      </DialogHeader>

      <form action={action} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="l-nom">Nom de l&apos;organisme *</label>
            <Input id="l-nom" name="nomOF" required className={field} placeholder="Ex. CAP Formation Sécurité" />
          </div>
          <div>
            <label className={labelCls} htmlFor="l-vert">Métier</label>
            <select id="l-vert" name="verticale" defaultValue="" className={selectCls}>
              <option value="">—</option>
              <option value="securite">Sécurité privée</option>
              <option value="transport">Transport (Taxi / VTC)</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="l-rep">Représentant légal</label>
            <Input id="l-rep" name="representantLegal" className={field} placeholder="Dirigeant / gérant" />
          </div>
          <div>
            <label className={labelCls} htmlFor="l-cp">Code postal</label>
            <Input id="l-cp" name="codePostal" className={field} placeholder="75001 (région déduite)" />
          </div>
          <div>
            <label className={labelCls} htmlFor="l-ville">Ville</label>
            <Input id="l-ville" name="ville" className={field} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="l-adr">Adresse</label>
            <Input id="l-adr" name="adresse" className={field} />
          </div>
          <div>
            <label className={labelCls} htmlFor="l-mail">E-mail</label>
            <Input id="l-mail" name="email" type="email" className={field} placeholder="contact@of.fr" />
          </div>
          <div>
            <label className={labelCls} htmlFor="l-tel">Téléphone</label>
            <Input id="l-tel" name="telephone" className={field} />
          </div>
          <div>
            <label className={labelCls} htmlFor="l-site">Site web</label>
            <Input id="l-site" name="siteWeb" className={field} placeholder="https://…" />
          </div>
          <div>
            <label className={labelCls} htmlFor="l-siret">SIRET</label>
            <Input id="l-siret" name="siret" className={field} placeholder="14 chiffres" />
          </div>
          <div>
            <label className={labelCls} htmlFor="l-type">Type de formation (transport)</label>
            <Input id="l-type" name="typeFormation" className={field} placeholder="Taxi / VTC / Taxi + VTC" />
          </div>
          <div>
            <label className={labelCls} htmlFor="l-agr">N° agrément (transport)</label>
            <Input id="l-agr" name="agrement" className={field} placeholder="N° / validité" />
          </div>
          <div>
            <label className={labelCls} htmlFor="l-prio">Priorité</label>
            <select id="l-prio" name="priorite" defaultValue="" className={selectCls}>
              <option value="">—</option>
              <option value="haute">Haute</option>
              <option value="moyenne">Moyenne</option>
              <option value="basse">Basse</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="l-statut">Statut</label>
            <select id="l-statut" name="statut" defaultValue="FICHIER" className={selectCls}>
              {STATUT_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="l-pa">Prochaine action</label>
            <Input id="l-pa" name="prochaineAction" className={field} placeholder="Ex. appeler cette semaine" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="l-notes">Notes</label>
            <Textarea id="l-notes" name="notes" rows={2} className="text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="l-src">Source / Remarques</label>
            <Input id="l-src" name="sourceRemarques" className={field} placeholder="Origine, réseau, doublon…" />
          </div>
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Annuler</DialogClose>
          <Button type="submit" disabled={pending} className="gap-1.5">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Ajouter le prospect
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
