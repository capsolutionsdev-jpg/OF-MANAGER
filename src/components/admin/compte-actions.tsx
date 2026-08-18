"use client";

import { useTransition } from "react";
import { Power, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleCompteActif, supprimerCompte, type CompteType } from "@/lib/actions/comptes-actions";

/** Boutons de gestion d'un compte : suspendre / réactiver (si compte d'accès) + supprimer. */
export function CompteActions({
  type,
  id,
  actif,
  hasLogin,
}: {
  type: CompteType;
  id: string;
  actif: boolean;
  hasLogin: boolean;
}) {
  const [pending, start] = useTransition();

  function toggle() {
    start(async () => {
      const res = await toggleCompteActif(type, id);
      if (!res.ok) toast.error(res.error ?? "Échec.");
      else toast.success(actif ? "Compte suspendu." : "Compte réactivé.");
    });
  }

  function supprimer() {
    if (!window.confirm("Supprimer définitivement ce compte ? Cette action est irréversible.")) return;
    start(async () => {
      const res = await supprimerCompte(type, id);
      if (!res.ok) toast.error(res.error ?? "Échec.");
      else toast.success("Compte supprimé.");
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      {hasLogin && (
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-60",
            !actif && "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300",
          )}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
          {actif ? "Suspendre" : "Réactiver"}
        </button>
      )}
      <button
        type="button"
        onClick={supprimer}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:hover:bg-rose-950/30"
      >
        <Trash2 className="h-3.5 w-3.5" /> Supprimer
      </button>
    </div>
  );
}
