"use client";

import { useState, useTransition } from "react";
import { UserCog, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { startImpersonation } from "@/lib/actions/impersonation-actions";

/**
 * Bouton « Se connecter en tant que » (console éditeur) : démarre le mode support
 * sur l'organisme, après confirmation. L'action redirige vers l'espace du client.
 */
export function ImpersonateButton({ organismeId, orgNom }: { organismeId: string; orgNom: string }) {
  const [pending, start] = useTransition();
  const [armed, setArmed] = useState(false);

  function go() {
    start(async () => {
      const res = await startImpersonation(organismeId);
      // Succès → l'action redirige (pas de retour). Un retour = erreur.
      if (res && "error" in res) toast.error(res.error);
    });
  }

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-primary hover:bg-muted"
      >
        <UserCog className="h-3.5 w-3.5" /> Se connecter en tant que
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs">
      <span className="text-muted-foreground">Voir l&apos;espace de «&nbsp;{orgNom}&nbsp;» ?</span>
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCog className="h-3 w-3" />} Confirmer
      </button>
      <button type="button" onClick={() => setArmed(false)} className="text-muted-foreground hover:text-foreground">
        Annuler
      </button>
    </span>
  );
}
