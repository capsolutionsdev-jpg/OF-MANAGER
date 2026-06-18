"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, FileDown } from "lucide-react";
import type { FinancementType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";
import { createInscription } from "@/lib/actions/inscription-actions";

export type SessionOption = {
  id: string;
  formationId: string;
  label: string; // "Titre formation — 01/06 → 15/06 (Paris)"
};

const sx =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";

export function QuickEnrollModal({
  candidatId,
  candidatName,
  sessions,
  formationId,
}: {
  candidatId: string;
  candidatName: string;
  /** Toutes les sessions ouvertes — filtrées par formationId si fourni */
  sessions: SessionOption[];
  formationId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [sessionId, setSessionId] = useState("");
  const [financement, setFinancement] = useState("");
  const [montant, setMontant] = useState("");
  const [doneId, setDoneId] = useState<string | null>(null);

  const available = formationId
    ? sessions.filter((s) => s.formationId === formationId)
    : sessions;

  function handleOpenChange(v: boolean) {
    if (!v) {
      // Réinitialise le formulaire à la fermeture
      setSessionId("");
      setFinancement("");
      setMontant("");
      setDoneId(null);
    }
    setOpen(v);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId) {
      toast.error("Sélectionnez une session.");
      return;
    }
    startTransition(async () => {
      const res = await createInscription({
        candidatId,
        sessionId,
        financementType: (financement as FinancementType) || undefined,
        statut: "VALIDEE",
        montant,
      });
      if (res.ok) {
        setDoneId(res.inscriptionId);
        toast.success(`${candidatName} inscrit(e) ! Documents prêts.`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button size="sm" variant="outline" className="gap-1" />}
      >
        <UserPlus className="h-3.5 w-3.5" />
        Inscrire
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inscrire {candidatName}</DialogTitle>
        </DialogHeader>

        {doneId ? (
          /* ── État succès ── */
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Inscription validée. Téléchargez le dossier complet (fiche,
              convention, règlement intérieur…) :
            </p>
            <a
              href={`/documents/${doneId}/zip`}
              download
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              <FileDown className="h-4 w-4" />
              Télécharger le dossier (.zip)
            </a>
            <div className="flex justify-end">
              <DialogClose render={<Button variant="outline" size="sm" />}>
                Fermer
              </DialogClose>
            </div>
          </div>
        ) : (
          /* ── Formulaire ── */
          <form onSubmit={onSubmit} className="space-y-4 py-2">
            {available.length === 0 ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Aucune session ouverte pour cette formation.{" "}
                <Link href="/sessions/nouvelle" className="underline">
                  Créez une session
                </Link>{" "}
                ou choisissez une autre formation.
              </p>
            ) : (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="qe-session">Session *</Label>
                  <select
                    id="qe-session"
                    className={sx}
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    required
                  >
                    <option value="">— Choisir une session —</option>
                    {available.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="qe-financement">Mode de financement</Label>
                  <select
                    id="qe-financement"
                    className={sx}
                    value={financement}
                    onChange={(e) => setFinancement(e.target.value)}
                  >
                    <option value="">Non précisé</option>
                    {Object.entries(FINANCEMENT_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="qe-montant">Montant (€)</Label>
                  <Input
                    id="qe-montant"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="ex. 1 200"
                    value={montant}
                    onChange={(e) => setMontant(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="-mx-4 -mb-4 flex justify-end gap-2 rounded-b-xl border-t bg-muted/50 px-4 py-3">
              <DialogClose render={<Button variant="outline" size="sm" type="button" />}>
                Annuler
              </DialogClose>
              {available.length > 0 && (
                <Button type="submit" size="sm" disabled={isPending}>
                  <UserPlus className="h-3.5 w-3.5" />
                  {isPending ? "Inscription…" : "Inscrire + générer les docs"}
                </Button>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
