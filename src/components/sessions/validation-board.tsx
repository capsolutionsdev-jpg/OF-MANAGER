"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2, Circle, AlertTriangle, XCircle, ExternalLink, Loader2,
  ShieldCheck, Lock, Archive, ChevronDown, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  validateItem, unvalidateItem, archiveSessionValidated,
} from "@/lib/actions/session-validation-actions";
import type {
  ValidationState, ValidationItem, ItemStatus, SectionState, CandidateState,
} from "@/lib/validation/types";

const fmtDate = (iso?: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch { return ""; }
};

function StatusPill({ status }: { status: ItemStatus }) {
  const map: Record<ItemStatus, { cls: string; label: string; Icon: typeof CheckCircle2 }> = {
    VALIDATED_AUTO: { cls: "bg-emerald-500/10 text-emerald-700", label: "Validé · auto", Icon: CheckCircle2 },
    VALIDATED_MANUAL: { cls: "bg-emerald-500/10 text-emerald-700", label: "Validé · manuel", Icon: CheckCircle2 },
    PENDING: { cls: "bg-amber-500/10 text-amber-700", label: "En attente", Icon: Circle },
    MISSING: { cls: "bg-red-500/10 text-red-700", label: "Manquant", Icon: XCircle },
  };
  const { cls, label, Icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

const isOk = (s: ItemStatus) => s === "VALIDATED_AUTO" || s === "VALIDATED_MANUAL";

/** Ligne d'un item : statut, accès direct, validation/annulation manuelle. */
function ItemRow({
  sessionId, item, onDone,
}: {
  sessionId: string;
  item: ValidationItem;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  function doValidate() {
    startTransition(async () => {
      const r = await validateItem(sessionId, item.key, {
        inscriptionId: item.inscriptionId,
        comment: comment.trim() || undefined,
      });
      if (r.ok) { toast.success("Validé."); setOpen(false); setComment(""); onDone(); }
      else toast.error(r.error);
    });
  }
  function doUnvalidate() {
    startTransition(async () => {
      const r = await unvalidateItem(sessionId, item.key, { inscriptionId: item.inscriptionId });
      if (r.ok) { toast.success("Validation annulée."); onDone(); }
      else toast.error(r.error);
    });
  }

  const manual = item.status === "VALIDATED_MANUAL";
  const auto = item.status === "VALIDATED_AUTO";

  return (
    <li className="rounded-md px-1 py-1.5 hover:bg-muted/40">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex-1 text-sm">{item.label}</span>
        <StatusPill status={item.status} />
        {item.href && (
          <a href={item.href} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Accéder au document">
            <ExternalLink className="h-3.5 w-3.5" /> Accéder
          </a>
        )}
        {/* Actions manuelles */}
        {!auto && item.canManual && !isOk(item.status) && (
          <Button size="sm" variant="outline" className="h-7"
            disabled={isPending} onClick={() => setOpen((o) => !o)}>
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Valider"}
          </Button>
        )}
        {manual && (
          <Button size="sm" variant="ghost" className="h-7 text-muted-foreground"
            disabled={isPending} onClick={doUnvalidate}>
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Annuler"}
          </Button>
        )}
      </div>

      {manual && item.by && (
        <p className="mt-0.5 pl-1 text-[11px] text-emerald-700">
          ✓ validé par {item.by}{item.at ? ` · ${fmtDate(item.at)}` : ""}
          {item.comment ? ` — « ${item.comment} »` : ""}
        </p>
      )}

      {open && !isOk(item.status) && (
        <div className="mt-2 space-y-2 rounded-md border bg-card p-2">
          <p className="text-[11px] text-muted-foreground">
            Confirmez la vérification physique de ce document (commentaire facultatif) :
          </p>
          <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder="Ex. reçu signé en main propre le…" />
          <div className="flex gap-2">
            <Button size="sm" onClick={doValidate} disabled={isPending}>
              {isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
              Confirmer la validation
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Annuler</Button>
          </div>
        </div>
      )}
    </li>
  );
}

function SectionCounter({ validated, total }: { validated: number; total: number }) {
  const ok = validated === total;
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${ok ? "text-emerald-700" : "text-amber-700"}`}>
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      {validated}/{total}
    </span>
  );
}

function DocSection({ section, sessionId, onDone }: { section: SectionState; sessionId: string; onDone: () => void }) {
  if (section.total === 0) return null;
  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
        <h3 className="text-sm font-semibold">{section.label}</h3>
        <SectionCounter validated={section.validated} total={section.total} />
      </div>
      <ul className="divide-y px-2 py-1">
        {section.items.map((it) => (
          <ItemRow key={it.key} sessionId={sessionId} item={it} onDone={onDone} />
        ))}
      </ul>
    </div>
  );
}

function CandidateRow({ c, sessionId, onDone }: { c: CandidateState; sessionId: string; onDone: () => void }) {
  const [open, setOpen] = useState(!c.compliant);
  return (
    <div className="rounded-lg border">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-left">
        <span className="flex items-center gap-2 text-sm font-medium">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {c.name}
          {c.compliant
            ? <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Conforme</span>
            : <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700">Incomplet</span>}
        </span>
        <SectionCounter validated={c.validated} total={c.total} />
      </button>
      {open && (
        <ul className="divide-y border-t px-2 py-1">
          {c.items.map((it) => (
            <ItemRow key={it.key} sessionId={sessionId} item={it} onDone={onDone} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Tableau de bord de validation d'une session (Qualiopi). */
export function ValidationBoard({ state }: { state: ValidationState }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const onDone = () => router.refresh();

  function archive() {
    startTransition(async () => {
      const r = await archiveSessionValidated(state.sessionId);
      if (r.ok) { toast.success("Session archivée."); router.refresh(); }
      else toast.error(r.error);
    });
  }

  const candOk = state.candidatesCompliant === state.candidatesTotal;

  return (
    <div className="space-y-5">
      {/* Progression globale */}
      <div className="rounded-lg border p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" /> Progression globale
          </h2>
          <span className="text-2xl font-bold tabular-nums">
            {state.percentage}%
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${state.isValidated ? "bg-emerald-500" : "bg-primary"}`}
            style={{ width: `${state.percentage}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
            <span>Documents de la session</span>
            <SectionCounter validated={state.session.validated} total={state.session.total} />
          </div>
          <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
            <span>Candidats</span>
            <span className={`inline-flex items-center gap-1 text-sm font-semibold ${candOk ? "text-emerald-700" : "text-amber-700"}`}>
              {candOk ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {state.candidatesCompliant}/{state.candidatesTotal}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
            <span>Documents du formateur</span>
            <SectionCounter validated={state.trainer.validated} total={state.trainer.total} />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {state.validatedItems}/{state.totalItems} éléments validés — une session ne
          peut être archivée que lorsque tous les documents obligatoires sont validés.
        </p>
      </div>

      {/* Sections détaillées */}
      <DocSection section={state.session} sessionId={state.sessionId} onDone={onDone} />

      <div className="rounded-lg border">
        <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
          <h3 className="text-sm font-semibold">Documents des candidats</h3>
          <span className={`inline-flex items-center gap-1 text-sm font-semibold ${candOk ? "text-emerald-700" : "text-amber-700"}`}>
            {candOk ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {state.candidatesCompliant}/{state.candidatesTotal} conformes
          </span>
        </div>
        <div className="space-y-2 p-2">
          {state.candidates.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Aucun candidat inscrit.</p>
          ) : (
            state.candidates.map((c) => (
              <CandidateRow key={c.inscriptionId} c={c} sessionId={state.sessionId} onDone={onDone} />
            ))
          )}
        </div>
      </div>

      <DocSection section={state.trainer} sessionId={state.sessionId} onDone={onDone} />

      {/* Archivage */}
      <div className="rounded-lg border bg-muted/20 p-4">
        {state.isArchived ? (
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <Archive className="h-4 w-4" /> Session archivée.
          </p>
        ) : state.isValidated ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Tous les documents obligatoires sont validés.
            </p>
            <Button onClick={archive} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
              Archiver la session
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" /> Archivage bloqué : des documents obligatoires
              sont manquants ou non validés.
            </p>
            <Button disabled variant="outline">
              <Lock className="mr-2 h-4 w-4" /> Archiver la session
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
