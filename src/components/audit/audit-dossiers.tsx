"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Check, ChevronDown, FileText, Send } from "lucide-react";

import { relancerDossierAudit, majDossierAudit } from "@/lib/actions/audit-controle-actions";
import { DOSSIER_CHECK_LABEL, type DossierCheck } from "@/lib/audit/dossier";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export type DossierDto = {
  id: string;
  inscriptionId: string;
  nom: string;
  email: string;
  statut: "A_TRAITER" | "EN_COURS" | "CONFORME";
  relanceSentAt: string | null;
  relanceCount: number;
  checks: DossierCheck[];
  pct: number;
  conforme: boolean;
  aTraiter: number;
};

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : null);

const CHECK_TONE: Record<string, string> = {
  PRESENT: "text-emerald-600 dark:text-emerald-400",
  A_SIGNER: "text-amber-600 dark:text-amber-400",
  MANQUANT: "text-red-600 dark:text-red-400",
  NA: "text-muted-foreground",
};

export function AuditDossiers({ dossiers }: { dossiers: DossierDto[] }) {
  if (dossiers.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Aucun dossier rattaché à cet audit.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {dossiers.map((d) => (
        <DossierRow key={d.id} d={d} />
      ))}
    </div>
  );
}

function DossierRow({ d }: { d: DossierDto }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function relancer() {
    startTransition(async () => {
      const res = await relancerDossierAudit(d.id);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(res.demo ? "Lien généré (mode démo : e-mail non envoyé)." : "Relance envoyée par e-mail.");
      router.refresh();
    });
  }
  function setStatut(statut: DossierDto["statut"]) {
    startTransition(async () => {
      const res = await majDossierAudit(d.id, { statut });
      if (!res.ok) { toast.error(res.error); return; }
      router.refresh();
    });
  }

  const statutBadge =
    d.statut === "CONFORME"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : d.statut === "EN_COURS"
        ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
        : "bg-muted text-muted-foreground";

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 text-left">
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          <span className="font-medium">{d.nom}</span>
        </button>
        <Badge className={statutBadge}>
          {d.statut === "CONFORME" ? "Conforme" : d.statut === "EN_COURS" ? "En cours" : "À traiter"}
        </Badge>
        <span className={`inline-flex items-center gap-1 text-xs ${d.conforme ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
          {d.conforme ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {d.pct}% conforme{d.aTraiter > 0 ? ` · ${d.aTraiter} à traiter` : ""}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {d.relanceSentAt && (
            <span className="text-xs text-muted-foreground">Relancé le {fmt(d.relanceSentAt)}{d.relanceCount > 1 ? ` (×${d.relanceCount})` : ""}</span>
          )}
          <Button size="sm" variant="outline" className="h-8 gap-1" disabled={isPending || d.conforme} onClick={relancer} title="Renvoyer le lien (compléter + signer)">
            <Send className="h-3.5 w-3.5" /> Relancer
          </Button>
          <select className={selectClass} value={d.statut} disabled={isPending} onChange={(e) => setStatut(e.target.value as DossierDto["statut"])}>
            <option value="A_TRAITER">À traiter</option>
            <option value="EN_COURS">En cours</option>
            <option value="CONFORME">Conforme</option>
          </select>
          <Button size="sm" variant="ghost" className="h-8 gap-1" render={<a href={`/documents/${d.inscriptionId}/pdf`} target="_blank" rel="noopener noreferrer" />}>
            <FileText className="h-3.5 w-3.5" /> Dossier
          </Button>
        </div>
      </div>

      {open && (
        <CardContent className="border-t pt-3">
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {d.checks.map((c) => (
              <li key={c.key} className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm">
                <span>
                  {c.label}
                  {c.indicateur ? <span className="ml-1 text-[11px] text-muted-foreground">(ind. {c.indicateur})</span> : null}
                </span>
                <span className={`text-xs font-semibold ${CHECK_TONE[c.statut]}`}>{DOSSIER_CHECK_LABEL[c.statut]}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
