"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2, LifeBuoy } from "lucide-react";
import { createCheckout } from "@/lib/actions/billing-actions";
import { euros, type FormuleKey, type Plan } from "@/lib/plans";
import { cn } from "@/lib/utils";

type PanelPlan = Plan & { populaire: boolean };

/**
 * Grille de souscription (formules au prix édité). Si Stripe est configuré,
 * « Souscrire » ouvre Checkout ; sinon, repli « Nous contacter ».
 */
export function SubscribePanel({
  plans,
  popular,
  configured,
}: {
  plans: PanelPlan[];
  popular: FormuleKey;
  configured: boolean;
}) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<FormuleKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const subscribe = (key: FormuleKey) => {
    if (!accepted) {
      setError("Merci d'accepter les CGV et la politique de confidentialité avant de souscrire.");
      return;
    }
    setError(null);
    setBusy(key);
    start(async () => {
      const res = await createCheckout(key, "mensuel", accepted);
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      setError(res.error ?? "Une erreur est survenue.");
      setBusy(null);
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {plans.map((p) => {
          const isPopular = p.key === popular;
          return (
            <div
              key={p.key}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-4 text-left",
                isPopular ? "border-primary ring-1 ring-primary/30" : "border-border",
              )}
            >
              {isPopular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                  Le plus choisi
                </span>
              )}
              <div className="text-sm font-bold" style={{ color: p.color }}>
                {p.name}
              </div>
              <div className="mt-1 flex items-end gap-1">
                <span className="text-2xl font-extrabold tracking-tight">{euros(p.price)}</span>
                <span className="mb-0.5 text-xs text-muted-foreground">/ mois</span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{p.tagline}</p>
              <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                <LifeBuoy className="h-3 w-3" /> {p.supportLevel}
              </p>
              <p className="mt-1 flex items-center gap-1 text-[11px] font-medium">
                <Check className="h-3 w-3 text-emerald-500" /> {p.features.length} fonctionnalités
              </p>

              {configured ? (
                <button
                  type="button"
                  onClick={() => subscribe(p.key)}
                  disabled={pending || !accepted}
                  aria-disabled={pending || !accepted}
                  title={!accepted ? "Acceptez les CGV pour souscrire" : undefined}
                  className={cn(
                    "mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition",
                    isPopular
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border border-border hover:bg-muted",
                    (pending || !accepted) && "opacity-60",
                  )}
                >
                  {busy === p.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Souscrire <ArrowRight className="h-4 w-4" /></>}
                </button>
              ) : (
                <Link
                  href="/contact"
                  className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
                >
                  Nous contacter <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {configured && (
        <label className="flex items-start justify-center gap-2 text-[11px] leading-snug text-muted-foreground">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => {
              setAccepted(e.target.checked);
              if (e.target.checked) setError(null);
            }}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-primary"
          />
          <span className="max-w-md text-left">
            J&apos;ai lu et j&apos;accepte les{" "}
            <Link href="/cgv" target="_blank" className="font-medium text-primary hover:underline">
              conditions générales de vente
            </Link>{" "}
            et la{" "}
            <Link href="/confidentialite" target="_blank" className="font-medium text-primary hover:underline">
              politique de confidentialité
            </Link>
            .
          </span>
        </label>
      )}

      {!configured && (
        <p className="text-center text-[11px] text-muted-foreground">
          Le paiement en ligne sera bientôt disponible — en attendant, notre équipe active votre compte.
        </p>
      )}
      {error && <p className="text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
