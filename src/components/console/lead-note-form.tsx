"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Loader2, StickyNote } from "lucide-react";
import { setLeadStatut, setLeadNotes } from "@/lib/actions/console-actions";
import { addLeadNote } from "@/lib/actions/growth-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Petits composants clients de la fiche lead (/console/prospects/[id]) :
 * — LeadNoteForm : ajoute une note horodatée à la timeline ;
 * — LeadNotesInternes : notes internes libres (sauvegarde au blur) ;
 * — LeadStatutSelect : changement rapide de statut.
 * Regroupés ici pour garder la page en Server Component pur.
 */

const STATUTS = [
  { key: "NOUVEAU", label: "Nouveau" },
  { key: "A_RAPPELER", label: "À rappeler" },
  { key: "RAPPELE", label: "Rappelé" },
  { key: "CONVERTI", label: "Converti" },
  { key: "PERDU", label: "Perdu" },
];

/** Formulaire d'ajout d'une note à la timeline du lead. */
export function LeadNoteForm({ leadId }: { leadId: string }) {
  const [contenu, setContenu] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!contenu.trim()) return;
    start(async () => {
      const res = await addLeadNote(leadId, contenu);
      if (res.ok) {
        setContenu("");
        setErreur(null);
      } else {
        setErreur(res.error ?? "Impossible d'ajouter la note.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <Textarea
        value={contenu}
        onChange={(e) => setContenu(e.target.value)}
        rows={2}
        placeholder="Ajouter une note à la timeline…"
        className="min-h-14 text-sm"
        disabled={pending}
        aria-label="Contenu de la note"
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending || !contenu.trim()}>
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <StickyNote className="h-3.5 w-3.5" />
          )}
          Ajouter une note
        </Button>
        {erreur && <p className="text-xs text-destructive">{erreur}</p>}
      </div>
    </form>
  );
}

/** Notes internes du lead (mêmes notes que la liste), sauvegardées au blur. */
export function LeadNotesInternes({ leadId, notes }: { leadId: string; notes: string | null }) {
  const [valeur, setValeur] = useState(notes ?? "");
  const [saving, startSave] = useTransition();

  return (
    <div className="flex items-start gap-2">
      <div className="relative flex-1">
        <StickyNote className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Textarea
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          onBlur={() => {
            if (valeur !== (notes ?? "")) startSave(() => setLeadNotes(leadId, valeur));
          }}
          rows={3}
          placeholder="Notes de rappel, contexte, historique d'échange…"
          className="pl-8 text-sm"
          aria-label="Notes internes"
        />
      </div>
      {saving && <Loader2 className="mt-2 h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  );
}

/** Sélecteur rapide de statut du lead. */
export function LeadStatutSelect({ leadId, statut }: { leadId: string; statut: string }) {
  const [pending, start] = useTransition();

  return (
    <span className="inline-flex items-center gap-2">
      <select
        defaultValue={statut}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          start(() => setLeadStatut(leadId, v));
        }}
        className="h-8 rounded-md border bg-transparent px-2 text-xs font-medium"
        aria-label="Statut du prospect"
      >
        {STATUTS.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
    </span>
  );
}
