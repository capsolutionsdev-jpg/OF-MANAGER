"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitFactureFormateur } from "@/lib/actions/formateur-actions";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("lecture"));
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(file);
  });
}

export function FactureFormateurForm({ sessions }: { sessions: { id: string; label: string; montantSuggere: number | null }[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [montant, setMontant] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [reference, setReference] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [fileName, setFileName] = useState("");
  const [fichierDataUrl, setFichierDataUrl] = useState<string>("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { toast.error("Fichier trop volumineux (max 8 Mo)."); return; }
    setFileName(f.name);
    setFichierDataUrl(await fileToDataUrl(f));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const m = Number(montant.replace(",", "."));
    if (!Number.isFinite(m) || m <= 0) { toast.error("Indiquez un montant valide."); return; }
    startTransition(async () => {
      const res = await submitFactureFormateur({
        montant: m,
        sessionId: sessionId || undefined,
        reference: reference || undefined,
        commentaire: commentaire || undefined,
        fichierDataUrl: fichierDataUrl || undefined,
      });
      if (res.ok) {
        toast.success("Facture transmise à l'organisme.");
        setMontant(""); setSessionId(""); setReference(""); setCommentaire(""); setFileName(""); setFichierDataUrl("");
        router.refresh();
      } else toast.error(res.error ?? "Erreur.");
    });
  }

  const sx = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="montant">Montant TTC (€) *</Label>
          <Input id="montant" inputMode="decimal" placeholder="ex. 700" value={montant} onChange={(e) => setMontant(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="reference">Référence facture</Label>
          <Input id="reference" placeholder="ex. F-2026-014" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="sessionId">Session concernée (facultatif)</Label>
          <select id="sessionId" className={sx} value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            <option value="">— Non rattachée —</option>
            {sessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="commentaire">Commentaire</Label>
          <textarea id="commentaire" rows={2} className="rounded-md border bg-transparent px-3 py-2 text-sm"
            value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Prestation, période, détails…" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
          <Upload className="h-4 w-4" /> Joindre la facture (PDF/image)
          <input type="file" accept="application/pdf,image/*" className="hidden" onChange={onFile} />
        </label>
        {fileName && <span className="text-xs text-muted-foreground">{fileName}</span>}
      </div>

      <Button type="submit" disabled={isPending}>
        <Receipt className="mr-1.5 h-4 w-4" /> {isPending ? "Envoi…" : "Transmettre ma facture"}
      </Button>
    </form>
  );
}
