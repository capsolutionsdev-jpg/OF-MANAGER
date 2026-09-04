"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FileText, FileCode2, Send, Trash2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { TONE_CLASSES } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { euros } from "@/lib/plans";
import { STATUT_FACTURE_LABELS } from "@/lib/factures/editeur";
import {
  genererFactureMensuelle,
  emettreFactureEditeur,
  transmettreFactureEditeur,
  setFactureEditeurStatut,
  deleteFactureEditeur,
} from "@/lib/actions/facture-editeur-actions";

export type FactureConsoleRow = {
  id: string;
  numero: string | null;
  statut: string;
  periodeLabel: string;
  montantTTC: number;
  client: string;
  organismeId: string;
};

const TONE: Record<string, string> = {
  BROUILLON: TONE_CLASSES.neutral,
  EMISE: TONE_CLASSES.info,
  DEPOSEE: TONE_CLASSES.warning,
  ENCAISSEE: TONE_CLASSES.success,
  REJETEE: TONE_CLASSES.danger,
  REFUSEE: TONE_CLASSES.danger,
  AVOIR: TONE_CLASSES.neutral,
};
const CYCLE = ["EMISE", "DEPOSEE", "ENCAISSEE", "REJETEE", "REFUSEE"];

export function FacturationConsole({
  factures,
  organismes,
}: {
  factures: FactureConsoleRow[];
  organismes: { id: string; nom: string }[];
}) {
  const [orgId, setOrgId] = useState(organismes[0]?.id ?? "");
  const [pending, start] = useTransition();

  const generer = () =>
    start(async () => {
      const r = await genererFactureMensuelle(orgId);
      toast[r.ok ? "success" : "error"](r.ok ? "Facture du mois générée (brouillon)." : r.error ?? "Échec.");
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/20 p-3">
        <label className="grid gap-1 text-xs font-medium">
          Générer la facture du mois pour
          <select
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className="min-w-56 rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            {organismes.length === 0 && <option value="">Aucun client</option>}
            {organismes.map((o) => (
              <option key={o.id} value={o.id}>{o.nom}</option>
            ))}
          </select>
        </label>
        <Button onClick={generer} disabled={pending || !orgId}>
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
          Générer (brouillon)
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Abonnement du dernier contrat signé + dépassements du mois. TVA 20 %.
        </p>
      </div>

      {factures.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Aucune facture éditeur pour l'instant.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">N°</th>
                <th className="px-4 py-2.5 font-medium">Client</th>
                <th className="px-4 py-2.5 font-medium">Période</th>
                <th className="px-4 py-2.5 text-right font-medium">TTC</th>
                <th className="px-4 py-2.5 font-medium">Statut</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {factures.map((f) => (
                <FactureRow key={f.id} f={f} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FactureRow({ f }: { f: FactureConsoleRow }) {
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  const brouillon = f.statut === "BROUILLON";

  const act = (fn: () => Promise<{ ok?: boolean; error?: string }>, okMsg: string) =>
    start(async () => {
      const r = await fn();
      toast[r.ok ? "success" : "error"](r.ok ? okMsg : r.error ?? "Échec.");
    });

  return (
    <tr className={cn("border-t align-top", pending && "opacity-60")}>
      <td className="px-4 py-2.5 font-medium">{f.numero ?? <span className="text-muted-foreground">brouillon</span>}</td>
      <td className="px-4 py-2.5">{f.client}</td>
      <td className="px-4 py-2.5 text-muted-foreground">{f.periodeLabel}</td>
      <td className="px-4 py-2.5 text-right font-medium tabular-nums">{euros(f.montantTTC)}</td>
      <td className="px-4 py-2.5">
        <Badge className={cn("text-[11px]", TONE[f.statut] ?? TONE_CLASSES.neutral)}>
          {STATUT_FACTURE_LABELS[f.statut as keyof typeof STATUT_FACTURE_LABELS] ?? f.statut}
        </Badge>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <a href={`/api/console/facture-editeur/${f.id}/pdf`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted">
            <FileText className="h-3.5 w-3.5" /> PDF
          </a>
          {!brouillon && (
            <a href={`/api/console/facture-editeur/${f.id}/facturx`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted">
              <FileCode2 className="h-3.5 w-3.5" /> Factur-X
            </a>
          )}
          {brouillon ? (
            <>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => act(() => emettreFactureEditeur(f.id), "Facture émise (n° attribué).")}>
                Émettre
              </Button>
              <Button size="sm" variant="ghost" disabled={pending} className="text-destructive hover:text-destructive/80" onClick={() => void (async () => { if (await confirm({ title: "Supprimer ce brouillon de facture ?", description: "Cette suppression est définitive.", confirmLabel: "Supprimer", destructive: true })) start(() => deleteFactureEditeur(f.id, f.organismeId)); })()}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              {f.statut === "EMISE" && (
                <Button size="sm" variant="outline" disabled={pending} onClick={() => act(() => transmettreFactureEditeur(f.id), "Transmise à la PDP.")}>
                  <Send className="mr-1 h-3.5 w-3.5" /> Transmettre
                </Button>
              )}
              <select
                value={f.statut}
                disabled={pending}
                onChange={(e) => { const v = e.target.value; act(() => setFactureEditeurStatut(f.id, v), "Statut mis à jour."); }}
                className="h-8 rounded-md border bg-background px-2 text-xs font-medium"
                aria-label="Cycle de vie"
              >
                {CYCLE.map((s) => (
                  <option key={s} value={s}>{STATUT_FACTURE_LABELS[s as keyof typeof STATUT_FACTURE_LABELS] ?? s}</option>
                ))}
              </select>
            </>
          )}
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
      </td>
    </tr>
  );
}
