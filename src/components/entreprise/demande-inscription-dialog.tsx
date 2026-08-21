"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FinancementType } from "@prisma/client";
import { createDemandeInscription, type SalarieDemande } from "@/lib/actions/demande-inscription-actions";

const FINANCEMENTS: { value: FinancementType; label: string }[] = [
  { value: "OPCO", label: "OPCO" },
  { value: "AUTOFINANCEMENT", label: "Autofinancement (l'entreprise règle)" },
  { value: "FRANCE_TRAVAIL", label: "France Travail" },
  { value: "AUTRE", label: "Autre" },
];

type Row = { nom: string; prenom: string; email: string };
type Candidat = { id: string; nom: string; prenom: string };

export function DemandeInscriptionDialog({
  sessionId,
  sessionLabel,
  candidats,
}: {
  sessionId: string;
  sessionLabel: string;
  candidats: Candidat[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [existants, setExistants] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [financement, setFinancement] = useState<FinancementType | "">("");

  function toggle(id: string) {
    setExistants((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }
  function setRow(i: number, k: keyof Row, v: string) {
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  }

  function submit() {
    const salaries: SalarieDemande[] = [
      ...existants.map((id) => ({ candidatId: id })),
      ...rows
        .filter((r) => r.nom.trim() && r.prenom.trim())
        .map((r) => ({ nom: r.nom.trim(), prenom: r.prenom.trim(), email: r.email.trim() || undefined })),
    ];
    if (salaries.length === 0) {
      toast.error("Sélectionnez ou ajoutez au moins un salarié.");
      return;
    }
    if (!financement) {
      toast.error("Précisez le mode de financement.");
      return;
    }
    start(async () => {
      const res = await createDemandeInscription({ sessionId, salaries, financementType: financement });
      if (!res.ok) {
        toast.error(res.error ?? "L'envoi a échoué.");
        return;
      }
      toast.success("Demande envoyée. Votre organisme de formation va la traiter.");
      setOpen(false);
      setExistants([]);
      setRows([]);
      setFinancement("");
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <UserPlus className="mr-1.5 h-4 w-4" />
        Demander l&apos;inscription
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Demander l&apos;inscription de salariés</DialogTitle>
            <DialogDescription>{sessionLabel}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="financement">Mode de financement</Label>
              <select
                id="financement"
                value={financement}
                onChange={(e) => setFinancement(e.target.value as FinancementType | "")}
                className="h-9 w-full rounded-md border bg-card px-3 text-sm"
              >
                <option value="">— Choisir —</option>
                {FINANCEMENTS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {candidats.length > 0 && (
              <div className="space-y-2">
                <Label>Vos salariés</Label>
                <div className="grid gap-1.5 rounded-lg border p-2 sm:grid-cols-2">
                  {candidats.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted">
                      <input
                        type="checkbox"
                        checked={existants.includes(c.id)}
                        onChange={() => toggle(c.id)}
                        className="h-4 w-4"
                      />
                      {c.prenom} {c.nom}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nouveaux salariés</Label>
              {rows.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {candidats.length > 0
                    ? "Ou ajoutez des salariés non encore enregistrés."
                    : "Ajoutez les salariés à inscrire."}
                </p>
              )}
              <div className="space-y-2">
                {rows.map((r, i) => (
                  <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-2">
                    <div className="min-w-28 flex-1 space-y-1">
                      <Label className="text-xs">Prénom</Label>
                      <Input value={r.prenom} onChange={(e) => setRow(i, "prenom", e.target.value)} />
                    </div>
                    <div className="min-w-28 flex-1 space-y-1">
                      <Label className="text-xs">Nom</Label>
                      <Input value={r.nom} onChange={(e) => setRow(i, "nom", e.target.value)} />
                    </div>
                    <div className="min-w-40 flex-1 space-y-1">
                      <Label className="text-xs">E-mail (facultatif)</Label>
                      <Input type="email" value={r.email} onChange={(e) => setRow(i, "email", e.target.value)} />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setRows((p) => [...p, { nom: "", prenom: "", email: "" }])}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Ajouter un salarié
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
