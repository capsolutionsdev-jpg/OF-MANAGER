"use client";

import { useTransition } from "react";
import { FileText, FileCode2, FileCheck2, Send, Trash2, Plus, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { euros } from "@/lib/plans";
import { STATUT_FACTURE_LABELS, type FactureStatut } from "@/lib/factures/editeur";
import { cn } from "@/lib/utils";
import {
  genererFactureMensuelle,
  emettreFactureEditeur,
  setFactureEditeurStatut,
  deleteFactureEditeur,
} from "@/lib/actions/facture-editeur-actions";

export type FactureEditeurRow = {
  id: string;
  numero: string | null;
  statut: FactureStatut;
  periodeLabel: string;
  montantTTC: number;
};

const STATUT_BADGE: Record<string, string> = {
  BROUILLON: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  EMISE: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  DEPOSEE: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  ENCAISSEE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  REJETEE: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  REFUSEE: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  AVOIR: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

// Statuts du cycle de vie proposés une fois la facture émise (réforme 2026).
const STATUTS_CYCLE: FactureStatut[] = ["EMISE", "DEPOSEE", "ENCAISSEE", "REJETEE", "REFUSEE"];

export function FacturesEditeurCard({
  organismeId,
  factures,
  sirenManquant,
}: {
  organismeId: string;
  factures: FactureEditeurRow[];
  sirenManquant: boolean;
}) {
  const [pending, start] = useTransition();

  function generer() {
    start(async () => {
      const res = await genererFactureMensuelle(organismeId);
      toast[res.ok ? "success" : "error"](res.ok ? "Facture du mois générée (brouillon)." : res.error ?? "Échec.");
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 py-3">
        <CardTitle className="text-sm text-muted-foreground">
          Facturation ({factures.length})
        </CardTitle>
        <Button size="sm" variant="outline" onClick={generer} disabled={pending}>
          {pending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
          Générer la facture du mois
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {sirenManquant && (
          <p className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <b>SIREN du client manquant.</b> Il devient une mention obligatoire de la facture
              électronique dès le 1ᵉʳ&nbsp;septembre 2026 — renseignez le SIRET du client dans sa fiche.
            </span>
          </p>
        )}

        {factures.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune facture pour ce client.</p>
        )}

        {factures.map((f) => (
          <FactureRow key={f.id} organismeId={organismeId} f={f} />
        ))}

        <p className="border-t pt-2 text-[11px] text-muted-foreground">
          <b>Factur-X</b> (PDF/A-3 : PDF lisible + XML EN 16931 embarqué) téléchargeable dès qu&apos;une
          facture est émise — c&apos;est le fichier à transmettre. Reste à brancher la transmission via PDP
          (choix du prestataire).
        </p>
      </CardContent>
    </Card>
  );
}

function FactureRow({ organismeId, f }: { organismeId: string; f: FactureEditeurRow }) {
  const [pending, start] = useTransition();
  const brouillon = f.statut === "BROUILLON";

  function emettre() {
    start(async () => {
      const res = await emettreFactureEditeur(f.id);
      toast[res.ok ? "success" : "error"](res.ok ? "Facture émise." : res.error ?? "Échec.");
    });
  }
  function changerStatut(statut: string) {
    start(async () => {
      const res = await setFactureEditeurStatut(f.id, statut);
      if (!res.ok) toast.error(res.error ?? "Échec.");
    });
  }
  function supprimer() {
    if (!window.confirm("Supprimer ce brouillon de facture ?")) return;
    start(() => deleteFactureEditeur(f.id, organismeId));
  }

  return (
    <div className={cn("rounded-lg border p-3", pending && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{f.numero ?? "Brouillon"}</span>
        <Badge className={cn("text-[11px]", STATUT_BADGE[f.statut])}>{STATUT_FACTURE_LABELS[f.statut]}</Badge>
        <span className="text-sm text-muted-foreground">
          {f.periodeLabel} · {euros(f.montantTTC)} TTC
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <a
          href={`/api/console/facture-editeur/${f.id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
        >
          <FileText className="h-3.5 w-3.5" /> PDF
        </a>
        {!brouillon && (
          <a
            href={`/api/console/facture-editeur/${f.id}/facturx`}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            title="PDF/A-3 avec XML EN 16931 embarqué — le fichier à transmettre"
          >
            <FileCheck2 className="h-3.5 w-3.5" /> Factur-X
          </a>
        )}
        <a
          href={`/api/console/facture-editeur/${f.id}/xml`}
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
          title="XML CII seul (EN 16931)"
        >
          <FileCode2 className="h-3.5 w-3.5" /> XML
        </a>
        {brouillon ? (
          <>
            <Button size="sm" variant="outline" onClick={emettre} disabled={pending}>
              <Send className="mr-1 h-3.5 w-3.5" /> Émettre
            </Button>
            <Button size="sm" variant="ghost" onClick={supprimer} disabled={pending} className="text-rose-600 hover:text-rose-700">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <select
            value={f.statut}
            onChange={(e) => changerStatut(e.target.value)}
            disabled={pending}
            className="rounded-md border bg-background px-2 py-1 text-xs"
            aria-label="Statut du cycle de vie"
          >
            {STATUTS_CYCLE.map((s) => (
              <option key={s} value={s}>{STATUT_FACTURE_LABELS[s]}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
