"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Send, FileText, CheckCircle2, MailCheck, Loader2, Eye, ChevronRight, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DOCUMENT_MENU } from "@/lib/documents/templates";
import { filterDocMenu, isRecyclageOuRemiseANiveau, type FormationLike } from "@/lib/documents/families";
// Sous-module PUR (catalog) — pas le barrel `titres` qui ré-exporte `numero`
// (→ prisma), ce qui ferait planter ce composant CLIENT dans le navigateur.
import { attestationCodeForFormation } from "@/lib/documents/titres/catalog";
import { MANUAL_EVENTS, type ManualEvent } from "@/lib/manual-events";
import { sendDocumentsToCandidate } from "@/lib/actions/document-actions";
import { sendAutomationEventNow, sendAttestationRecyclage } from "@/lib/actions/manual-send-actions";
import { DocsSignesChecklist } from "@/components/inscriptions/docs-signes-checklist";
import { SsiapDiplomeInline } from "@/components/inscriptions/ssiap-diplome-inline";

/**
 * Bouton « Actions » qui ouvre un panneau latéral (petite page) : voir & envoyer
 * des documents, déclencher un envoi manuel, et valider les documents « signés
 * sur place » un par un (avec traçabilité du collaborateur).
 */
export function InscriptionQuickActions({
  inscriptionId,
  sessionId,
  docsSignes,
  formation,
  candidatId,
  ssiap,
}: {
  inscriptionId: string;
  sessionId?: string;
  docsSignes?: Record<string, { nom: string; date: string }>;
  /** Formation de la session : filtre les documents non pertinents (SSIAP…). */
  formation?: FormationLike;
  candidatId?: string;
  /** Diplôme SSIAP détenu par le candidat (pour l'attestation de recyclage / RAN). */
  ssiap?: { numero?: string | null; date?: string | null; niveau?: number | null };
}) {
  // Session de recyclage / remise à niveau SSIAP → champ « n° diplôme détenu ».
  const attCode = formation ? attestationCodeForFormation(formation) : null;
  const showSsiap =
    !!candidatId && !!attCode && (attCode.endsWith("_RECYCLAGE") || attCode.endsWith("_RAN"));
  // Recyclage / remise à niveau (SSIAP, MAC…) → action manuelle d'envoi de
  // l'attestation de recyclage (ces formations n'ont pas d'attestation de
  // réussite — cf. #13).
  const isRecyc = formation ? isRecyclageOuRemiseANiveau(formation) : false;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Ne proposer que les documents pertinents pour cette formation.
  const menu = formation ? filterDocMenu(DOCUMENT_MENU, formation) : DOCUMENT_MENU;
  const allTypes = menu.map((d) => d.type);
  const toutCoche = selected.length === allTypes.length && allTypes.length > 0;
  const toggle = (t: string) =>
    setSelected((c) => (c.includes(t) ? c.filter((x) => x !== t) : [...c, t]));

  function run(key: string, p: Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setBusy(key);
    startTransition(async () => {
      const r = await p;
      setBusy(null);
      if (r.ok) { toast.success(okMsg); router.refresh(); }
      else toast.error(r.error ?? "Action impossible.");
    });
  }

  function envoyerDocs() {
    if (selected.length === 0) return;
    setBusy("docs");
    startTransition(async () => {
      const r = await sendDocumentsToCandidate(inscriptionId, selected, message);
      setBusy(null);
      if (r.ok) {
        toast.success(r.count > 1 ? `${r.count} documents envoyés.` : "Document envoyé.");
        setSelected([]); setMessage("");
      } else toast.error(r.error);
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
        <Send className="h-3.5 w-3.5" /> Actions
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Actions pour cet inscrit</SheetTitle>
          <SheetDescription>Envoyer des documents, déclencher un envoi ou valider une signature.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-8">
          {/* ── Diplôme SSIAP détenu (recyclage / remise à niveau) ── */}
          {showSsiap && (
            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Award className="h-4 w-4 text-amber-600" /> Diplôme SSIAP détenu
              </h3>
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  Reporté sur l&apos;attestation de recyclage / remise à niveau générée.
                </p>
                <SsiapDiplomeInline
                  candidatId={candidatId!}
                  numero={ssiap?.numero}
                  date={ssiap?.date}
                  niveau={ssiap?.niveau}
                  formationTitre={formation?.titre}
                />
              </div>
            </section>
          )}

          {/* ── Documents ── */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4 text-primary" /> Documents
              </h3>
              <button type="button" onClick={() => setSelected(toutCoche ? [] : allTypes)}
                className="text-xs font-medium text-primary hover:underline">
                {toutCoche ? "Tout décocher" : "Tout sélectionner"}
              </button>
            </div>
            <div className="max-h-64 space-y-0.5 overflow-y-auto rounded-lg border p-1.5">
              {menu.map((d) => (
                <div key={d.type} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                  <input type="checkbox" className="h-4 w-4" checked={selected.includes(d.type)} onChange={() => toggle(d.type)} />
                  <label className="flex-1 cursor-pointer" onClick={() => toggle(d.type)}>{d.label}</label>
                  <a href={`/documents/${inscriptionId}/${d.type}`} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Ouvrir / prévisualiser">
                    <Eye className="h-3.5 w-3.5" /> Voir
                  </a>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <Label htmlFor="qa-msg" className="text-xs">Message (facultatif)</Label>
              <Textarea id="qa-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
                placeholder="Ajouté au corps de l'e-mail…" />
            </div>
            <Button className="mt-2 w-full" onClick={envoyerDocs} disabled={isPending || selected.length === 0}>
              {busy === "docs" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {selected.length > 1 ? `Envoyer les ${selected.length} documents` : "Envoyer le document"}
            </Button>
          </section>

          {/* ── Envoyer maintenant ── */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <MailCheck className="h-4 w-4 text-primary" /> Envoyer maintenant
            </h3>
            <div className="grid gap-1.5">
              {MANUAL_EVENTS.map((e) => (
                <button key={e.key} type="button" disabled={isPending}
                  onClick={() => run(e.key, sendAutomationEventNow(inscriptionId, e.key as ManualEvent), `${e.label} — envoyé.`)}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60 disabled:opacity-50">
                  <span>{e.label}</span>
                  {busy === e.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4 opacity-50" />}
                </button>
              ))}
            </div>
            {isRecyc && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => run("att_recyc", sendAttestationRecyclage(inscriptionId), "Attestation de recyclage — envoyée.")}
                className="mt-1.5 flex w-full items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-left text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                <span className="flex items-center gap-2">
                  <Award className="h-4 w-4" /> Envoyer l&apos;attestation de recyclage
                </span>
                {busy === "att_recyc" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4 opacity-50" />}
              </button>
            )}
          </section>

          {/* ── Validation : documents signés sur place, un par un ── */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Validation — documents signés sur place
            </h3>
            <div className="rounded-lg border p-3">
              <DocsSignesChecklist inscriptionId={inscriptionId} sessionId={sessionId} docsSignes={docsSignes} formation={formation} />
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
