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
import { sendDocumentToCandidate } from "@/lib/actions/document-actions";

const inputCx =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function DocumentsMenu({ inscriptionId }: { inscriptionId: string }) {
  const [sendOpen, setSendOpen] = useState(false);
  const [type, setType] = useState(DOCUMENT_MENU[0]?.type ?? "");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function envoyer() {
    if (!type) return;
    startTransition(async () => {
      const r = await sendDocumentToCandidate(inscriptionId, type, message);
      if (r.ok) {
        toast.success("Document envoyé au candidat.");
        setSendOpen(false);
        setMessage("");
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
            <Send className="mr-2 h-4 w-4" /> Envoyer un document au candidat…
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
            <DialogTitle>Envoyer un document au candidat</DialogTitle>
            <DialogDescription>Choisissez le document ; il sera envoyé en PDF par e-mail.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="doc-type">Document</Label>
              <select id="doc-type" value={type} onChange={(e) => setType(e.target.value)} className={inputCx}>
                {DOCUMENT_MENU.map((d) => (
                  <option key={d.type} value={d.type}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="doc-msg">Message (facultatif)</Label>
              <Textarea id="doc-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
                placeholder="Message ajouté au corps de l'e-mail…" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSendOpen(false)} disabled={isPending}>Annuler</Button>
              <Button onClick={envoyer} disabled={isPending || !type}>
                {isPending ? "Envoi…" : "Envoyer"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
