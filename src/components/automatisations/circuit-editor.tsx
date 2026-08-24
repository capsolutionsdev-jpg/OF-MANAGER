"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Loader2, Trash2, Pencil, X, Mail, FileText, PenLine, ClipboardCheck, Star, ListChecks } from "lucide-react";
import {
  addStep, updateStep, deleteStep, toggleCircuitActif, renameCircuit, type StepInput,
} from "@/lib/actions/circuit-actions";
import {
  timelineColumns, describeOffset, ACTION_LABELS, AUDIENCE_LABELS,
  type CircuitAudience, type CircuitActionType,
} from "@/lib/automation/circuits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

export type EditorStep = {
  id: string;
  ancre: "DEBUT" | "FIN";
  offsetJours: number;
  audience: CircuitAudience;
  typeAction: CircuitActionType;
  titre: string | null;
  emailSujet: string | null;
  emailCorps: string | null;
  documentType: string | null;
};

const AUDIENCE_STYLE: Record<CircuitAudience, string> = {
  APPRENANT: "border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200",
  ENTREPRISE: "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
  FORMATEUR: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
};
const ACTION_ICON: Record<CircuitActionType, typeof Mail> = {
  EMAIL: Mail,
  DOCUMENT: FileText,
  ESIGN: PenLine,
  EVALUATION: ClipboardCheck,
  SATISFACTION: Star,
  AUTO_EVALUATION: ListChecks,
};

const selectCls = "h-9 w-full rounded-lg border bg-transparent px-2 text-sm";
const labelCls = "mb-1 block text-xs font-medium text-muted-foreground";

const EMPTY: StepInput = { ancre: "DEBUT", offsetJours: -7, audience: "APPRENANT", typeAction: "EMAIL" };

export function CircuitEditor({
  id, nom, description, actif, steps,
}: { id: string; nom: string; description: string | null; actif: boolean; steps: EditorStep[] }) {
  const confirm = useConfirm();
  const [busy, startBusy] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StepInput>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [titre, setTitre] = useState(nom);

  const columns = useMemo(() => timelineColumns(steps), [steps]);
  const stepsByColumn = useMemo(() => {
    const m = new Map<string, EditorStep[]>();
    for (const s of steps) {
      const key = `${s.ancre}:${s.offsetJours}`;
      (m.get(key) ?? m.set(key, []).get(key)!).push(s);
    }
    return m;
  }, [steps]);

  const openAdd = () => { setEditingId(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (s: EditorStep) => {
    setEditingId(s.id);
    setForm({ ancre: s.ancre, offsetJours: s.offsetJours, audience: s.audience, typeAction: s.typeAction, titre: s.titre ?? "", emailSujet: s.emailSujet ?? "", emailCorps: s.emailCorps ?? "", documentType: s.documentType ?? "" });
    setShowForm(true);
  };
  const save = () => {
    startBusy(async () => {
      if (editingId) await updateStep(editingId, form);
      else await addStep(id, form);
      setShowForm(false); setEditingId(null); setForm(EMPTY);
    });
  };

  return (
    <div className="space-y-5">
      <Link href="/automatisations/circuits" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Tous les circuits
      </Link>

      {/* En-tête : nom éditable + activation */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          onBlur={() => { if (titre.trim() && titre !== nom) startBusy(() => renameCircuit(id, titre, description ?? undefined)); }}
          className="h-10 max-w-md text-lg font-semibold"
        />
        <Badge variant={actif ? "default" : "secondary"}>{actif ? "Actif" : "Brouillon"}</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button variant={actif ? "outline" : "default"} size="sm" disabled={busy} onClick={() => startBusy(() => toggleCircuitActif(id))}>
            {actif ? "Désactiver" : "Activer le circuit"}
          </Button>
          <Button size="sm" className="gap-1.5" onClick={openAdd}><Plus className="h-4 w-4" /> Ajouter une étape</Button>
        </div>
      </div>

      {!actif && (
        <p className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Ce circuit est en brouillon — <strong>aucun envoi</strong> tant qu&apos;il n&apos;est pas activé.
        </p>
      )}

      {/* Timeline */}
      {steps.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Timeline vide. Ajoutez une première étape (ex. « Convocation, 7 jours avant début »).
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-muted/20 p-4">
          <div className="flex min-w-max gap-4">
            {columns.map((col) => (
              <div key={col.key} className="flex w-48 shrink-0 flex-col gap-2">
                <div className="rounded-md bg-background px-2 py-1 text-center text-xs font-semibold text-muted-foreground">
                  {col.label}
                </div>
                {(stepsByColumn.get(col.key) ?? []).map((s) => {
                  const Icon = ACTION_ICON[s.typeAction];
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => openEdit(s)}
                      className={cn("group rounded-xl border p-3 text-left transition-shadow hover:shadow", AUDIENCE_STYLE[s.audience])}
                    >
                      <p className="flex items-center gap-1.5 text-sm font-semibold">
                        <Icon className="h-4 w-4 shrink-0" />
                        {s.titre || ACTION_LABELS[s.typeAction]}
                      </p>
                      <p className="mt-0.5 text-[11px] opacity-80">{ACTION_LABELS[s.typeAction]} · {AUDIENCE_LABELS[s.audience]}</p>
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] opacity-0 transition-opacity group-hover:opacity-70">
                        <Pencil className="h-3 w-3" /> modifier
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panneau ajout / édition d'étape */}
      {showForm && (
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">{editingId ? "Modifier l'étape" : "Nouvelle étape"}</p>
            <Button size="icon-sm" variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); }}><X className="h-4 w-4" /></Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className={labelCls}>Ancre</label>
              <select className={selectCls} value={form.ancre} onChange={(e) => setForm({ ...form, ancre: e.target.value })}>
                <option value="DEBUT">Début de session</option>
                <option value="FIN">Fin de session</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Décalage (jours, négatif = avant)</label>
              <Input type="number" min={-365} max={365} value={form.offsetJours ?? 0} onChange={(e) => setForm({ ...form, offsetJours: Number(e.target.value) })} className="h-9 text-sm" />
            </div>
            <div>
              <label className={labelCls}>Destinataire</label>
              <select className={selectCls} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                <option value="APPRENANT">Apprenants</option>
                <option value="ENTREPRISE">Entreprises</option>
                <option value="FORMATEUR">Formateurs</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Type d&apos;action</label>
              <select className={selectCls} value={form.typeAction} onChange={(e) => setForm({ ...form, typeAction: e.target.value })}>
                <option value="EMAIL">Email</option>
                <option value="DOCUMENT">Document</option>
                <option value="ESIGN">Document à signer</option>
                <option value="EVALUATION">Évaluation</option>
                <option value="SATISFACTION">Satisfaction</option>
                <option value="AUTO_EVALUATION">Auto-évaluation</option>
              </select>
            </div>
            <div className="sm:col-span-4">
              <label className={labelCls}>Libellé du nœud (optionnel)</label>
              <Input value={form.titre ?? ""} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Ex. Convocation" className="h-9 text-sm" />
            </div>
            {form.typeAction === "EMAIL" && (
              <>
                <div className="sm:col-span-4">
                  <label className={labelCls}>Sujet de l&apos;e-mail</label>
                  <Input value={form.emailSujet ?? ""} onChange={(e) => setForm({ ...form, emailSujet: e.target.value })} className="h-9 text-sm" />
                </div>
                <div className="sm:col-span-4">
                  <label className={labelCls}>Corps de l&apos;e-mail</label>
                  <Textarea value={form.emailCorps ?? ""} onChange={(e) => setForm({ ...form, emailCorps: e.target.value })} rows={3} className="text-sm" />
                </div>
              </>
            )}
            {(form.typeAction === "DOCUMENT" || form.typeAction === "ESIGN") && (
              <div className="sm:col-span-4">
                <label className={labelCls}>Type de document</label>
                <Input value={form.documentType ?? ""} onChange={(e) => setForm({ ...form, documentType: e.target.value })} placeholder="Ex. convention, attestation…" className="h-9 text-sm" />
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" onClick={save} disabled={busy} className="gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {editingId ? "Enregistrer" : "Ajouter l'étape"}
            </Button>
            {editingId && (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                disabled={busy}
                onClick={async () => {
                  if (await confirm({ title: "Supprimer cette étape ?", destructive: true, confirmLabel: "Supprimer" })) {
                    startBusy(async () => { await deleteStep(editingId); setShowForm(false); setEditingId(null); });
                  }
                }}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Supprimer
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
