"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { createDossierOpco } from "@/lib/actions/opco-actions";

type Insc = { id: string; label: string };

/** Formulaire « Nouveau dossier OPCO » (panneau latéral). */
export function NewOpcoDossier({ inscriptions }: { inscriptions: Insc[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [inscriptionId, setInscriptionId] = useState("");
  const [financeur, setFinanceur] = useState("");
  const [montant, setMontant] = useState("");
  const [subrogation, setSubrogation] = useState(true);

  function creer() {
    if (!inscriptionId) return toast.error("Choisissez une inscription.");
    if (!financeur.trim()) return toast.error("Indiquez l'OPCO.");
    start(async () => {
      const r = await createDossierOpco({
        inscriptionId,
        financeur: financeur.trim(),
        montant: montant ? Number(montant.replace(",", ".")) : null,
        subrogation,
      });
      if (r.ok) {
        toast.success("Dossier OPCO créé.");
        setOpen(false);
        setInscriptionId(""); setFinanceur(""); setMontant("");
        router.refresh();
      } else toast.error(r.error ?? "Échec.");
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="h-4 w-4" /> Dossier OPCO
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Nouveau dossier OPCO</SheetTitle>
          <SheetDescription>Créez le dossier de prise en charge pour une inscription.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-8">
          <div className="grid gap-1.5">
            <Label htmlFor="opco-insc">Inscription</Label>
            <select
              id="opco-insc"
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={inscriptionId}
              onChange={(e) => setInscriptionId(e.target.value)}
            >
              <option value="">— Choisir —</option>
              {inscriptions.map((i) => (
                <option key={i.id} value={i.id}>{i.label}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="opco-fin">OPCO financeur</Label>
            <Input id="opco-fin" placeholder="AKTO, OPCO 2i, Atlas…" value={financeur} onChange={(e) => setFinanceur(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="opco-montant">Montant demandé (€)</Label>
            <Input id="opco-montant" inputMode="decimal" placeholder="1500" value={montant} onChange={(e) => setMontant(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={subrogation} onChange={(e) => setSubrogation(e.target.checked)} />
            Subrogation (l&apos;OPCO règle directement l&apos;organisme)
          </label>
          <Button className="w-full" onClick={creer} disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Créer le dossier
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
