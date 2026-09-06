"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, ShieldQuestion, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { setInscriptionDossierCpf } from "@/lib/actions/inscription-actions";
import {
  evaluerConformiteCpf,
  positionnementDeadline,
  MIN_JOURS_OUVRES,
} from "@/lib/cpf-compliance";

const fmt = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR") : "—");

/**
 * Saisie du dossier CPF (n° + date de création) sur une inscription, avec contrôle
 * d'antériorité du test de positionnement (le test doit être RÉALISÉ avant, J-1
 * ouvré). Affiche la VRAIE date de réalisation, un aperçu de conformité en direct,
 * et permet une dérogation MOTIVÉE si le test n'est pas antérieur — jamais
 * d'antidatage. S'appuie sur l'action serveur setInscriptionDossierCpf (la gate).
 *
 * Monté uniquement pour les inscriptions financées par le CPF.
 */
export function DossierCpfDialog({
  inscriptionId,
  positionnementCompletedAt,
  cpfDossierNumero,
  cpfDossierCreeLe,
  derogationLe,
}: {
  inscriptionId: string;
  positionnementCompletedAt: string | null; // ISO
  cpfDossierNumero: string | null;
  cpfDossierCreeLe: string | null; // ISO
  derogationLe: string | null; // ISO
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [numero, setNumero] = useState(cpfDossierNumero ?? "");
  const [dateStr, setDateStr] = useState(cpfDossierCreeLe ? cpfDossierCreeLe.slice(0, 10) : "");
  const [motif, setMotif] = useState("");
  const [showDerog, setShowDerog] = useState(false);
  const [pending, start] = useTransition();

  const realisation = positionnementCompletedAt ? new Date(positionnementCompletedAt) : null;

  // Statut STOCKÉ (pour la pastille du bouton) : d'après ce qui est en base.
  const stored = evaluerConformiteCpf({
    financementCpf: true,
    cpfDossierCreeLe: cpfDossierCreeLe ? new Date(cpfDossierCreeLe) : null,
    positionnementCompletedAt: realisation,
    derogation: Boolean(derogationLe),
  });

  // Aperçu LIVE (pendant la saisie de la date dans la fenêtre).
  const saisieDossier = dateStr ? new Date(dateStr) : null;
  const apercu = evaluerConformiteCpf({
    financementCpf: true,
    cpfDossierCreeLe: saisieDossier,
    positionnementCompletedAt: realisation,
    derogation: false,
  });
  const deadline = saisieDossier ? positionnementDeadline(saisieDossier, MIN_JOURS_OUVRES) : null;

  const submit = (avecDerogation: boolean) => {
    start(async () => {
      const res = await setInscriptionDossierCpf(inscriptionId, {
        numero: numero || null,
        dateCreation: dateStr || null,
        derogationMotif: avecDerogation ? motif : null,
      });
      if (res.ok) {
        toast.success("Dossier CPF enregistré.");
        setOpen(false);
        setShowDerog(false);
        setMotif("");
        router.refresh();
      } else {
        toast.error(res.error ?? "Test de positionnement non conforme.");
        setShowDerog(true); // propose la dérogation motivée
      }
    });
  };

  // Pastille du bouton selon le statut stocké.
  const pastille =
    stored.statut === "CONFORME"
      ? { icon: ShieldCheck, cls: "text-emerald-600", label: "Dossier CPF" }
      : stored.statut === "DEROGATION"
        ? { icon: TriangleAlert, cls: "text-amber-600", label: "Dossier CPF" }
        : stored.statut === "DOSSIER_ABSENT"
          ? { icon: ShieldQuestion, cls: "text-muted-foreground", label: "Dossier CPF" }
          : { icon: ShieldAlert, cls: "text-destructive", label: "Dossier CPF" };
  const PastilleIcon = pastille.icon;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-[11px] font-medium hover:bg-muted"
        title="Dossier CPF & conformité du positionnement"
      >
        <PastilleIcon className={`h-3.5 w-3.5 ${pastille.cls}`} />
        {pastille.label}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Dossier CPF & antériorité du positionnement</DialogTitle>
            <DialogDescription>
              Le test de positionnement doit être <b>réalisé avant</b> la création du dossier
              CPF (au moins J-{MIN_JOURS_OUVRES} ouvré). La date de réalisation est la vraie —
              jamais modifiée.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Test réalisé le</span>
              <span className="font-medium">{fmt(realisation)}</span>
            </div>
            {deadline && (
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">Date limite (J-{MIN_JOURS_OUVRES} ouvré)</span>
                <span className="font-medium">{fmt(deadline)}</span>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="cpf-num">N° de dossier CPF</Label>
              <Input
                id="cpf-num"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Réf. EDOF"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cpf-date">Date de création du dossier</Label>
              <Input
                id="cpf-date"
                type="date"
                value={dateStr}
                onChange={(e) => {
                  setDateStr(e.target.value);
                  setShowDerog(false);
                }}
              />
            </div>
          </div>

          {/* Aperçu de conformité en direct */}
          {saisieDossier && (
            <div
              className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                apercu.bloquant
                  ? "border-destructive/30 bg-destructive/5 text-destructive"
                  : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {apercu.bloquant ? (
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>
                {apercu.bloquant
                  ? apercu.message
                  : "Conforme : le test est bien antérieur à la création du dossier."}
              </span>
            </div>
          )}

          {/* Dérogation motivée (proposée uniquement après un blocage) */}
          {showDerog && (
            <div className="grid gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
              <Label htmlFor="cpf-motif" className="text-amber-700 dark:text-amber-300">
                Dérogation — motif (tracé, sans falsifier la date)
              </Label>
              <textarea
                id="cpf-motif"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-input bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                placeholder="Ex. test réalisé en présentiel le jour même, justificatif au dossier…"
              />
              <p className="text-xs text-muted-foreground">
                La dérogation est journalisée (qui / quand / pourquoi). La vraie date de
                réalisation reste inchangée.
              </p>
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Annuler</DialogClose>
            {showDerog ? (
              <Button
                type="button"
                variant="destructive"
                disabled={pending || motif.trim() === ""}
                onClick={() => submit(true)}
              >
                Forcer avec dérogation
              </Button>
            ) : (
              <Button type="button" disabled={pending} onClick={() => submit(false)}>
                {pending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
