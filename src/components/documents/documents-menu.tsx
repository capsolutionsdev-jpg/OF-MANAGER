"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FileText, Download, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DOCUMENT_MENU } from "@/lib/documents/templates";
import { sendDocumentsToCandidate } from "@/lib/actions/document-actions";

export function DocumentsMenu({ inscriptionId }: { inscriptionId: string }) {
  const [sendOpen, setSendOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const allTypes = DOCUMENT_MENU.map((d) => d.type);
  const toutCoche = selected.length === allTypes.length && allTypes.length > 0;
  function toggle(type: string) {
    setSelected((cur) => (cur.includes(type) ? cur.filter((t) => t !== type) : [...cur, type]));
  }

  function envoyer() {
    if (selected.length === 0) return;
    startTransition(async () => {
      const r = await sendDocumentsToCandidate(inscriptionId, selected, message);
      if (r.ok) {
        toast.success(
          r.count > 1 ? `${r.count} documents envoyés au candidat.` : "Document envoyé au candidat.",
        );
        setSendOpen(false);
        setMessage("");
        setSelected([]);
      } else toast.error(r.error);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Documents" />}>
          <FileText className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setSendOpen(true)}>
            <Send className="mr-2 h-4 w-4" /> Envoyer des documents au candidat…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<a href={`/documents/${inscriptionId}/zip`} download />}>
            <Download className="mr-2 h-4 w-4" />
            Tout télécharger (Word .zip)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {DOCUMENT_MENU.map((d) => (
            <DropdownMenuItem
              key={d.type}
              render={<Link href={`/documents/${inscriptionId}/${d.type}`} target="_blank" />}
            >
              {d.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Envoyer des documents au candidat</DialogTitle>
            <DialogDescription>
              Cochez un ou plusieurs documents ; ils seront envoyés en PDF par e-mail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label>Documents ({selected.length} sélectionné{selected.length > 1 ? "s" : ""})</Label>
                <button
                  type="button"
                  onClick={() => setSelected(toutCoche ? [] : allTypes)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {toutCoche ? "Tout décocher" : "Tout sélectionner"}
                </button>
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
                {DOCUMENT_MENU.map((d) => (
                  <label key={d.type} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={selected.includes(d.type)}
                      onChange={() => toggle(d.type)}
                    />
                    {d.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="doc-msg">Message (facultatif)</Label>
              <Textarea id="doc-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
                placeholder="Message ajouté au corps de l'e-mail…" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSendOpen(false)} disabled={isPending}>Annuler</Button>
              <Button onClick={envoyer} disabled={isPending || selected.length === 0}>
                {isPending ? "Envoi…" : selected.length > 1 ? `Envoyer (${selected.length})` : "Envoyer"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
