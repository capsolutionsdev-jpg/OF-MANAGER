"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, Check, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createApprenantAccount } from "@/lib/actions/apprenant-actions";

/**
 * Création / réinitialisation de l'accès « espace apprenant » depuis la fiche
 * candidat (en plus de la page E-learning → Apprenants). Identifiant = e-mail.
 */
export function CandidatAccessPanel({
  candidatId, hasAccount, email,
}: { candidatId: string; hasAccount: boolean; email: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState(() => `CAP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
  const [done, setDone] = useState(false);

  function submit() {
    startTransition(async () => {
      const res = await createApprenantAccount(candidatId, pwd);
      if (res.ok) { setDone(true); toast.success("Accès apprenant créé."); router.refresh(); }
      else toast.error(res.error ?? "Erreur.");
    });
  }

  return (
    <div className="mt-4 space-y-2 border-t pt-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <GraduationCap className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">Espace apprenant</span>
        {hasAccount ? (
          <span className="text-emerald-700">Accès actif{email ? ` · ${email}` : ""}</span>
        ) : (
          <span className="text-muted-foreground">Aucun accès{!email ? " — renseignez d'abord un e-mail" : ""}</span>
        )}
        {!open && (
          <Button size="sm" variant="outline" disabled={!email} onClick={() => setOpen(true)}>
            <KeyRound className="mr-1.5 h-3.5 w-3.5" />
            {hasAccount ? "Réinitialiser" : "Créer l'accès"}
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
              Communiquez ces identifiants : <strong>{email}</strong> / <strong>{pwd}</strong>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
