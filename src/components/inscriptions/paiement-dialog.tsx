"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PaiementStatut } from "@prisma/client";
import { Wallet, Plus, Trash2, Loader2, FileText } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MODE_PAIEMENT_OPTIONS } from "@/lib/validators/inscription";
import { enregistrerPaiement, supprimerPaiement } from "@/lib/actions/paiement-actions";

type Reglement = { id: string; montant: number; date: string; mode: string | null; reference: string | null };

const eur = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

const STATUT_TONE: Record<PaiementStatut, "neutral" | "warning" | "success" | "info" | "destructive"> = {
  EN_ATTENTE: "neutral",
  ACOMPTE: "warning",
  PAYE: "success",
  REMBOURSE: "info",
  ANNULE: "destructive",
};
const STATUT_LABEL: Record<PaiementStatut, string> = {
  EN_ATTENTE: "En attente",
  ACOMPTE: "Acompte versé",
  PAYE: "Payé",
  REMBOURSE: "Remboursé",
  ANNULE: "Annulé",
};

export function PaiementDialog({
  inscriptionId,
  candidatNom,
  montant,
  paiements,
  paiementStatut,
}: {
  inscriptionId: string;
  candidatNom: string;
  montant: number | null;
  paiements: Reglement[];
  paiementStatut: PaiementStatut;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [m, setM] = useState("");
  const [mode, setMode] = useState("");
  const [date, setDate] = useState("");
  const [ref, setRef] = useState("");

  const totalPaye = useMemo(() => paiements.reduce((s, p) => s + p.montant, 0), [paiements]);
  const reste = montant != null ? Math.max(0, montant - totalPaye) : null;
  const mixte = useMemo(
    () => new Set(paiements.map((p) => p.mode).filter(Boolean)).size > 1,
    [paiements],
  );

  function add() {
    const val = Number(m.replace(",", "."));
    if (!val || val <= 0) {
      toast.error("Saisissez un montant supérieur à 0.");
      return;
    }
    setBusy("add");
    startTransition(async () => {
      const fd = new FormData();
      fd.set("montant", String(val));
      // Toujours présents (le schéma accepte "" ; le serveur normalise en null) —
      // sinon FormData.get() renvoie null et z.string().optional() le REJETTE.
      fd.set("mode", mode);
      fd.set("reference", ref.trim());
      if (date) fd.set("date", date);
      const res = await enregistrerPaiement(inscriptionId, undefined, fd);
      setBusy(null);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Règlement enregistré.");
      setM("");
      setMode("");
      setRef("");
      setDate("");
      router.refresh();
    });
  }

  function del(id: string) {
    setBusy(id);
    startTransition(async () => {
      const res = await supprimerPaiement(id);
      setBusy(null);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Règlement supprimé.");
      router.refresh();
    });
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" />}>
        <Wallet className="h-3.5 w-3.5" />
        Règlements{paiements.length > 0 ? ` (${paiements.length})` : ""}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Règlements — {candidatNom}</DialogTitle>
          <DialogDescription>
            Ajoutez un ou plusieurs règlements. Plusieurs moyens différents = <b>paiement mixte</b>
            {" "}(ex. CPF + virement). Le statut se met à jour automatiquement.
          </DialogDescription>
        </DialogHeader>

        {/* Résumé */}
        <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Dû</div>
            <div className="font-semibold tabular-nums">{montant != null ? eur(montant) : "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Payé</div>
            <div className="font-semibold tabular-nums text-emerald-600">{eur(totalPaye)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Reste</div>
            <div className="font-semibold tabular-nums">{reste != null ? eur(reste) : "—"}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STATUT_TONE[paiementStatut]}>{STATUT_LABEL[paiementStatut]}</Badge>
          {mixte && <Badge variant="info">Paiement mixte</Badge>}
        </div>

        {/* Liste des règlements */}
        {paiements.length > 0 && (
          <ul className="divide-y overflow-hidden rounded-lg border">
            {paiements.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <span className="font-medium tabular-nums">{eur(p.montant)}</span>
                {p.mode && <Badge variant="neutral">{p.mode}</Badge>}
                <span className="text-xs text-muted-foreground">
                  {new Date(p.date).toLocaleDateString("fr-FR")}
                </span>
                {p.reference && (
                  <span className="truncate text-xs text-muted-foreground">réf. {p.reference}</span>
                )}
                <div className="ml-auto flex items-center gap-1.5">
                  <a
                    href={`/paiements/${p.id}/recu`}
                    target="_blank"
                    rel="noreferrer"
                    title="Reçu de paiement à remettre au client (PDF)"
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium hover:bg-muted"
                  >
                    <FileText className="h-3.5 w-3.5" /> Reçu
                  </a>
                  <button
                    type="button"
                    onClick={() => del(p.id)}
                    disabled={isPending}
                    title="Supprimer ce règlement"
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Ajouter un règlement */}
        <div className="rounded-lg border p-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Ajouter un règlement</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Input
              type="number" step="0.01" min="0" inputMode="decimal"
              placeholder="Montant €" value={m} onChange={(e) => setM(e.target.value)}
            />
            <select
              className="h-9 rounded-md border bg-transparent px-2 text-sm"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              aria-label="Moyen de paiement"
            >
              <option value="">Moyen…</option>
              {MODE_PAIEMENT_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date du règlement" />
            <Input placeholder="Référence (facult.)" value={ref} onChange={(e) => setRef(e.target.value)} />
          </div>
          <Button size="sm" className="mt-2.5" onClick={add} disabled={isPending}>
            {busy === "add" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
            Ajouter le règlement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
