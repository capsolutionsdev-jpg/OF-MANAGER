"use client";

import { useState, useTransition } from "react";
import { Loader2, Save, Flame } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { setLeadQualification } from "@/lib/actions/console-actions";
import {
  axesQualification,
  temperature,
  appelUrgent,
  VERTICALE_LABELS,
  OUTIL_LABELS,
  QUALIOPI_LABELS,
  type QualifInput,
} from "@/lib/growth/qualification";

type Props = {
  leadId: string;
  verticale: string | null;
  outilActuel: string | null;
  echeanceQualiopi: string | null;
  volumeStagiairesMois: number | null;
  malARemplir: boolean | null;
  decideur: string | null;
};

const TEMP: Record<string, { label: string; cls: string }> = {
  chaud: { label: "Chaud", cls: "bg-emerald-500/15 text-emerald-700" },
  tiede: { label: "Tiède", cls: "bg-amber-500/15 text-amber-700" },
  froid: { label: "Froid", cls: "bg-slate-500/15 text-slate-600" },
};

export function LeadQualificationForm(p: Props) {
  const [verticale, setVerticale] = useState(p.verticale ?? "");
  const [outilActuel, setOutil] = useState(p.outilActuel ?? "");
  const [echeanceQualiopi, setQualiopi] = useState(p.echeanceQualiopi ?? "");
  const [volume, setVolume] = useState(p.volumeStagiairesMois?.toString() ?? "");
  const [malARemplir, setMal] = useState(p.malARemplir == null ? "" : p.malARemplir ? "oui" : "non");
  const [decideur, setDecideur] = useState(p.decideur ?? "");
  const [pending, start] = useTransition();

  const q: QualifInput = {
    verticale: (verticale || null) as QualifInput["verticale"],
    outilActuel: (outilActuel || null) as QualifInput["outilActuel"],
    echeanceQualiopi: (echeanceQualiopi || null) as QualifInput["echeanceQualiopi"],
    volumeStagiairesMois: volume ? Number(volume) : null,
    malARemplir: malARemplir === "" ? null : malARemplir === "oui",
  };
  const axes = axesQualification(q);
  const temp = TEMP[temperature(q)];
  const urgent = appelUrgent(q);

  const save = () =>
    start(async () => {
      const res = await setLeadQualification(p.leadId, {
        verticale: verticale || null,
        outilActuel: outilActuel || null,
        echeanceQualiopi: echeanceQualiopi || null,
        volumeStagiairesMois: volume ? Number(volume) : null,
        malARemplir: malARemplir === "" ? null : malARemplir === "oui",
        decideur: decideur || null,
      });
      toast[res.ok ? "success" : "error"](res.ok ? "Qualification enregistrée." : "Échec.");
    });

  const selCls = "w-full rounded-md border bg-background px-2 py-1.5 text-sm";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", temp.cls)}>{temp.label}</span>
        {urgent && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
            <Flame className="h-3 w-3" /> Appel sous 24 h
          </span>
        )}
        <span className="text-xs text-muted-foreground">{axes.filter((a) => a.chaud).length}/5 axes chauds</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-medium">
          Verticale
          <select className={selCls} value={verticale} onChange={(e) => setVerticale(e.target.value)}>
            <option value="">—</option>
            {Object.entries(VERTICALE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Outil actuel
          <select className={selCls} value={outilActuel} onChange={(e) => setOutil(e.target.value)}>
            <option value="">—</option>
            {Object.entries(OUTIL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Échéance Qualiopi
          <select className={selCls} value={echeanceQualiopi} onChange={(e) => setQualiopi(e.target.value)}>
            <option value="">—</option>
            {Object.entries(QUALIOPI_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Stagiaires / mois
          <Input type="number" min="0" value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="ex. 300" />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Remplit ses sessions ?
          <select className={selCls} value={malARemplir} onChange={(e) => setMal(e.target.value)}>
            <option value="">—</option>
            <option value="oui">A du mal à remplir</option>
            <option value="non">Carnet plein</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Décideur
          <Input value={decideur} onChange={(e) => setDecideur(e.target.value)} placeholder="Nom / fonction" />
        </label>
      </div>

      <ul className="space-y-1 text-xs">
        {axes.map((a) => (
          <li key={a.key} className="flex items-start gap-2">
            <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", a.chaud ? "bg-emerald-500" : "bg-slate-300")} />
            <span>
              <span className="font-medium">{a.label}</span>
              <span className="text-muted-foreground"> — {a.detail}</span>
            </span>
          </li>
        ))}
      </ul>

      <Button size="sm" onClick={save} disabled={pending}>
        {pending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
        Enregistrer la qualification
      </Button>
    </div>
  );
}
