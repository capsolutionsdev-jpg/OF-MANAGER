"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown, Send, FileText, CheckCircle2, MailCheck, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DOCUMENT_MENU } from "@/lib/documents/templates";
import { MANUAL_EVENTS, type ManualEvent } from "@/lib/manual-events";
import { sendDocumentsToCandidate, markInscriptionSignedOnSite } from "@/lib/actions/document-actions";
import { sendAutomationEventNow } from "@/lib/actions/manual-send-actions";

/**
 * Bouton « Actions » lisible et interactif, par inscrit : envoi de documents
 * (un ou plusieurs), envoi manuel des automatismes, et « signé sur place ».
 */
export function InscriptionQuickActions({ inscriptionId }: { inscriptionId: string }) {
  const router = useRouter();
  const [docOpen, setDocOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  const allTypes = DOCUMENT_MENU.map((d) => d.type);
  const toutCoche = selected.length === allTypes.length && allTypes.length > 0;
  const toggle = (t: string) =>
    setSelected((c) => (c.includes(t) ? c.filter((x) => x !== t) : [...c, t]));

  function run(label: string, p: Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setBusy(label);
    startTransition(async () => {
      const r = await p;
      setBusy(null);
      if (r.ok) { toast.success(okMsg); router.refresh(); }
      else toast.error(r.error ?? "Action impossible.");
    });
  }

  function envoyerDocs() {
    if (selected.length === 0) return;
    startTransition(async () => {
      const r = await sendDocumentsToCandidate(inscriptionId, selected, message);
      if (r.ok) {
        toast.success(r.count > 1 ? `${r.count} documents envoyés.` : "Document envoyé.");
        setDocOpen(false); setSelected([]); setMessage("");
      } else toast.error(r.error);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="sm" className="gap-1.5" disabled={isPending} />}
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Actions
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-2 text-xs">
            <FileText className="h-3.5 w-3.5" /> Documents
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setDocOpen(true)}>
            Envoyer des documents au candidat…
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex items-center gap-2 text-xs">
            <MailCheck className="h-3.5 w-3.5" /> Envoyer maintenant
          </DropdownMenuLabel>
          {MANUAL_EVENTS.map((e) => (
            <DropdownMenuItem
              key={e.key}
              onClick={() =>
                run(e.label, sendAutomationEventNow(inscriptionId, e.key as ManualEvent), `${e.label} — envoyé.`)
              }
            >
              {busy === e.label && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {e.label}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex items-center gap-2 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" /> Validation
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() =>
              run("signe", markInscriptionSignedOnSite(inscriptionId), "Marqué signé sur place.")
            }
          >
            ✅ Signé sur place
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog : envoi multi-documents */}
      <Dialog open={docOpen} onOpenChange={setDocOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Envoyer des documents au candidat</DialogTitle>
            <DialogDescription>Cochez un ou plusieurs documents — envoyés en PDF par e-mail.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="mb-1 flex items-center justify-between">
              <Label>{selected.length} sélectionné{selected.length > 1 ? "s" : ""}</Label>
              <button type="button" onClick={() => setSelected(toutCoche ? [] : allTypes)}
                className="text-xs font-medium text-primary hover:underline">
                {toutCoche ? "Tout décocher" : "Tout sélectionner"}
              </button>
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
              {DOCUMENT_MENU.map((d) => (
                <label key={d.type} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50">
                  <input type="checkbox" checked={selected.includes(d.type)} onChange={() => toggle(d.type)} />
                  {d.label}
                </label>
              ))}
            </div>
            <div>
              <Label htmlFor="qa-msg">Message (facultatif)</Label>
              <Textarea id="qa-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
                placeholder="Message ajouté au corps de l'e-mail…" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDocOpen(false)} disabled={isPending}>Annuler</Button>
              <Button onClick={envoyerDocs} disabled={isPending || selected.length === 0}>
                {isPending ? "Envoi…" : selected.length > 1 ? `Envoyer (${selected.length})` : "Envoyer"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
