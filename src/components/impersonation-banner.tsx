"use client";

import { UserCog } from "lucide-react";
import { stopImpersonation } from "@/lib/actions/impersonation-actions";

/**
 * Bandeau « mode support » affiché en permanence tant que le SUPERADMIN est
 * connecté en tant qu'un organisme client. Toujours visible (sticky) → la sortie
 * reste accessible depuis n'importe quelle page.
 */
export function ImpersonationBanner({ orgNom }: { orgNom: string }) {
  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-indigo-600 px-4 py-2 text-center text-xs font-semibold text-white">
      <UserCog className="h-3.5 w-3.5 shrink-0" />
      Mode support — vous êtes connecté en tant que «&nbsp;{orgNom}&nbsp;»
      <form action={stopImpersonation} className="contents">
        <button
          type="submit"
          className="ml-1 rounded bg-white/20 px-2 py-0.5 underline underline-offset-2 hover:bg-white/30"
        >
          Quitter le mode support
        </button>
      </form>
    </div>
  );
}
