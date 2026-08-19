"use client";

import { useState, useTransition } from "react";
import { Mail, Phone, Trash2, Loader2, PhoneCall, StickyNote } from "lucide-react";
import { setLeadStatut, setLeadNotes, deleteLead } from "@/lib/actions/console-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { TONE_CLASSES } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

export type LeadRow = {
  id: string;
  nom: string;
  organisme: string | null;
  email: string;
  telephone: string | null;
  message: string | null;
  source: string | null;
  hebergement: string | null;
  formations: string[];
  statut: string;
  notes: string | null;
  lu: boolean;
  rappeleAt: Date | null;
  createdAt: Date;
};

const STATUTS = [
  { key: "NOUVEAU", label: "Nouveau" },
  { key: "A_RAPPELER", label: "À rappeler" },
  { key: "RAPPELE", label: "Rappelé" },
  { key: "CONVERTI", label: "Converti" },
  { key: "PERDU", label: "Perdu" },
];
const STATUT_BADGE: Record<string, string> = {
  NOUVEAU: TONE_CLASSES.info,
  A_RAPPELER: TONE_CLASSES.warning,
  RAPPELE: TONE_CLASSES.info,
  CONVERTI: TONE_CLASSES.success,
  PERDU: TONE_CLASSES.neutral,
};
const FILTERS = [
  { key: "ACTIFS", label: "À traiter" },
  { key: "TOUS", label: "Tous" },
  { key: "CONVERTI", label: "Convertis" },
];

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
}

function LeadCard({ lead }: { lead: LeadRow }) {
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [savingNotes, startNotes] = useTransition();

  return (
    <Card className={cn(!lead.lu && "ring-1 ring-primary/40")}>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start gap-2">
          <div>
            <p className="flex items-center gap-2 font-medium">
              {!lead.lu && <span className="h-2 w-2 rounded-full bg-primary" />}
              {lead.nom}
              {lead.organisme && <span className="text-sm font-normal text-muted-foreground">· {lead.organisme}</span>}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 hover:text-primary"><Mail className="h-3.5 w-3.5" />{lead.email}</a>
              {lead.telephone && <a href={`tel:${lead.telephone}`} className="inline-flex items-center gap-1 hover:text-primary"><Phone className="h-3.5 w-3.5" />{lead.telephone}</a>}
              <span>{lead.source === "demo" ? "Démo" : "Contact"} · {fmt(lead.createdAt)}</span>
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge className={cn("text-[11px]", STATUT_BADGE[lead.statut])}>{STATUTS.find((s) => s.key === lead.statut)?.label}</Badge>
            <select
              defaultValue={lead.statut}
              disabled={pending}
              onChange={(e) => { const v = e.target.value; start(() => setLeadStatut(lead.id, v)); }}
              className="h-8 rounded-md border bg-transparent px-2 text-xs font-medium"
              aria-label="Statut du lead"
            >
              {STATUTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>
        </div>

        {(lead.message || lead.hebergement || lead.formations.length > 0) && (
          <div className="rounded-md bg-muted/40 p-3 text-sm">
            {lead.hebergement && <p className="text-xs text-muted-foreground">Hébergement : <span className="text-foreground">{lead.hebergement}</span></p>}
            {lead.formations.length > 0 && <p className="text-xs text-muted-foreground">Formations : <span className="text-foreground">{lead.formations.join(", ")}</span></p>}
            {lead.message && <p className="mt-1 whitespace-pre-wrap">{lead.message}</p>}
          </div>
        )}

        <div className="flex flex-wrap items-start gap-2">
          <div className="relative flex-1">
            <StickyNote className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => { if (notes !== (lead.notes ?? "")) startNotes(() => setLeadNotes(lead.id, notes)); }}
              rows={1}
              placeholder="Notes de rappel…"
              className="min-h-9 pl-8 text-sm"
            />
          </div>
          {savingNotes && <Loader2 className="mt-2 h-4 w-4 animate-spin text-muted-foreground" />}
          {lead.statut !== "RAPPELE" && lead.statut !== "CONVERTI" && (
            <Button size="sm" variant="outline" className="h-9 gap-1.5" disabled={pending} onClick={() => start(() => setLeadStatut(lead.id, "RAPPELE"))}>
              <PhoneCall className="h-3.5 w-3.5" /> Marquer rappelé
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-9 text-muted-foreground hover:text-destructive" disabled={pending} onClick={async () => { if (await confirm({ title: "Supprimer ce lead ?", description: "Cette action est définitive.", destructive: true, confirmLabel: "Supprimer" })) start(() => deleteLead(lead.id)); }} aria-label="Supprimer">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  const [filter, setFilter] = useState("ACTIFS");
  const shown = leads.filter((l) => {
    if (filter === "TOUS") return true;
    if (filter === "CONVERTI") return l.statut === "CONVERTI";
    return l.statut === "NOUVEAU" || l.statut === "A_RAPPELER"; // À traiter
  });
  const counts = {
    ACTIFS: leads.filter((l) => l.statut === "NOUVEAU" || l.statut === "A_RAPPELER").length,
    TOUS: leads.length,
    CONVERTI: leads.filter((l) => l.statut === "CONVERTI").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === f.key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {f.label} <span className="opacity-60">{counts[f.key as keyof typeof counts]}</span>
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Aucun prospect ici.</CardContent></Card>
      ) : (
        shown.map((l) => <LeadCard key={l.id} lead={l} />)
      )}
    </div>
  );
}
