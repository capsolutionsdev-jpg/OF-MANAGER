"use client";

import { useState, useTransition } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { openBillingPortal } from "@/lib/actions/billing-actions";

/** Bouton « Gérer mon abonnement » → ouvre le portail de facturation Stripe. */
export function ManageSubscriptionButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const open = () =>
    start(async () => {
      setError(null);
      const r = await openBillingPortal();
      if (r.url) window.location.href = r.url;
      else setError(r.error ?? "Une erreur est survenue.");
    });

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={open}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        Gérer mon abonnement
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
