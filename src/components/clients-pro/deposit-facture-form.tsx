"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { depositFacture } from "@/lib/actions/facture-actions";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function DepositFactureForm({ entrepriseId }: { entrepriseId: string }) {
  const [pending, start] = useTransition();
  const [reference, setReference] = useState("");
  const [montant, setMontant] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!reference.trim()) return toast.error("Indiquez la référence de la facture.");
    if (!file) return toast.error("Sélectionnez le PDF de la facture.");
    if (file.type !== "application/pdf") return toast.error("Le fichier doit être un PDF.");
    if (file.size > 8 * 1024 * 1024) return toast.error("PDF trop volumineux (max 8 Mo).");

    start(async () => {
      try {
        const dataUrl = await readAsDataUrl(file);
        const parsed = montant.trim() ? Number(montant.replace(",", ".")) : undefined;
        const montantTTC = typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined;
        const res = await depositFacture({ entrepriseId, reference: reference.trim(), montantTTC, dataUrl });
        if (!res.ok) {
          toast.error(res.error ?? "Le dépôt a échoué.");
          return;
        }
        toast.success("Facture déposée. Le client peut la télécharger depuis son espace.");
        setReference("");
        setMontant("");
        if (fileRef.current) fileRef.current.value = "";
      } catch {
        toast.error("Le dépôt a échoué.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-3">
      <div className="min-w-40 space-y-1.5">
        <Label htmlFor="facture-ref">Référence</Label>
        <Input
          id="facture-ref"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="FAC-2026-001"
        />
      </div>
      <div className="w-32 space-y-1.5">
        <Label htmlFor="facture-montant">Montant TTC (€)</Label>
        <Input
          id="facture-montant"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          inputMode="decimal"
          placeholder="1200"
        />
      </div>
      <div className="min-w-48 flex-1 space-y-1.5">
        <Label htmlFor="facture-file">Fichier PDF</Label>
        <Input id="facture-file" ref={fileRef} type="file" accept="application/pdf" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        <UploadCloud className="mr-1.5 h-4 w-4" />
        {pending ? "Dépôt…" : "Déposer"}
      </Button>
    </form>
  );
}
