"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileDown, KeyRound, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import {
  setFactureFormateurStatut,
  createFormateurAccess,
} from "@/lib/actions/formateur-actions";
import { genProvisionalPassword } from "@/lib/gen-password";

const LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente", EN_COURS: "En cours", PAYEE: "Payée", REJETEE: "Rejetée",
};
const TONE: Record<string, StatusTone> = {
  EN_ATTENTE: "warning",
  EN_COURS: "info",
  PAYEE: "success",
  REJETEE: "danger",
};
const STATUTS = ["EN_ATTENTE", "EN_COURS", "PAYEE", "REJETEE"] as const;

export type FactureRow = {
  id: string; reference: string | null; montant: string; statut: string;
  fichierUrl: string | null; createdAt: string; sessionTitre: string | null;
};

export function FormateurFacturesAdmin({ factures }: { factures: FactureRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(id: string, statut: string) {
    startTransition(async () => {
      const res = await setFactureFormateurStatut(id, statut as (typeof STATUTS)[number]);
      if (res.ok) { toast.success("Statut mis à jour."); router.refresh(); }
      else toast.error(res.error ?? "Erreur.");
    });
  }

  if (factures.length === 0)
    return <p className="text-sm text-muted-foreground">Aucune facture transmise par ce formateur.</p>;

  return (
    <ul className="divide-y">
      {factures.map((f) => (
        <li key={f.id} className="flex flex-wrap items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {f.montant}{f.reference ? ` · ${f.reference}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {f.sessionTitre ?? "Non rattachée"} · transmise le {f.createdAt}
            </p>
          </div>
          {f.fichierUrl && (
            <a href={f.fichierUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <FileDown className="h-3.5 w-3.5" /> Justificatif
            </a>
          )}
          <StatusBadge tone={TONE[f.statut] ?? "neutral"}>{LABELS[f.statut] ?? f.statut}</StatusBadge>
          <select
            value={f.statut}
            disabled={pending}
            onChange={(e) => change(f.id, e.target.value)}
            className="h-8 rounded-md border bg-transparent px-2 text-xs"
          >
            {STATUTS.map((s) => <option key={s} value={s}>{LABELS[s]}</option>)}
          </select>
        </li>
      ))}
    </ul>
  );
}

export function FormateurAccessPanel({
  formateurId, hasAccess, email,
}: { formateurId: string; hasAccess: boolean; email: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState(() => genProvisionalPassword("FORM"));
  const [done, setDone] = useState(false);

  function submit() {
    startTransition(async () => {
      const res = await createFormateurAccess(formateurId, pwd);
      if (res.ok) { setDone(true); toast.success("Accès formateur créé."); router.refresh(); }
      else toast.error(res.error ?? "Erreur.");
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <KeyRound className="h-4 w-4 text-muted-foreground" />
        {hasAccess ? (
          <span>Accès actif{email ? ` · ${email}` : ""}. {!open && "Réinitialiser le mot de passe ?"}</span>
        ) : (
          <span>Aucun accès à l&apos;espace formateur. {!email && "Renseignez d'abord un e-mail."}</span>
        )}
        {!open && (
          <Button size="sm" variant="outline" disabled={!email} onClick={() => setOpen(true)}>
            {hasAccess ? "Réinitialiser" : "Créer l'accès"}
          </Button>
        )}
      </div>
      {open && (
        <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
          <div className="grid gap-1">
            <label className="text-xs font-medium">Mot de passe provisoire</label>
            <Input value={pwd} onChange={(e) => setPwd(e.target.value)} className="h-9 w-56" />
          </div>
          <Button size="sm" onClick={submit} disabled={pending || pwd.length < 6}>
            {done ? <Check className="mr-1 h-4 w-4" /> : null}
            {pending ? "…" : "Valider"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          {done && (
            <p className="w-full text-xs text-muted-foreground">
              Communiquez ces identifiants au formateur : <strong>{email}</strong> / <strong>{pwd}</strong>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
