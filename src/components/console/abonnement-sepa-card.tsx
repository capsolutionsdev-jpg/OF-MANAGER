"use client";

import { useState, useTransition } from "react";
import { Landmark, Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createSepaSetupForClient } from "@/lib/actions/console-billing-actions";

/** Abonnement Stripe + mise en place du mandat de prélèvement SEPA (console éditeur). */
export function AbonnementSepaCard({
  organismeId,
  hasSubscription,
  abonnementJusquau,
  stripeConfigured,
}: {
  organismeId: string;
  hasSubscription: boolean;
  abonnementJusquau: string | null;
  stripeConfigured: boolean;
}) {
  const [pending, start] = useTransition();
  const [url, setUrl] = useState<string | null>(null);

  function generer() {
    start(async () => {
      const res = await createSepaSetupForClient(organismeId);
      if (res.ok && res.url) {
        setUrl(res.url);
        try {
          await navigator.clipboard.writeText(res.url);
        } catch {
          /* clipboard indispo → le lien reste affiché ci-dessous */
        }
        toast.success("Lien de mandat SEPA généré et copié — transmettez-le au gérant du client.");
      } else {
        toast.error(res.error ?? "Échec.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm text-muted-foreground">Abonnement &amp; prélèvement SEPA</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {hasSubscription ? (
            <Badge variant="success">Abonnement Stripe actif</Badge>
          ) : (
            <Badge variant="secondary">Aucun abonnement Stripe</Badge>
          )}
          {abonnementJusquau && <span className="text-muted-foreground">Payé jusqu&apos;au {abonnementJusquau}</span>}
        </div>

        {stripeConfigured ? (
          <>
            <Button size="sm" variant="outline" onClick={generer} disabled={pending}>
              {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Landmark className="mr-1.5 h-4 w-4" />}
              {hasSubscription ? "Régénérer le lien de mandat SEPA" : "Générer le lien de mandat SEPA"}
            </Button>
            {url && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2 text-xs">
                <input readOnly value={url} className="min-w-0 flex-1 bg-transparent outline-none" aria-label="Lien de mandat SEPA" />
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(url); toast.success("Copié."); }}
                  className="inline-flex items-center gap-1 hover:text-primary"
                  aria-label="Copier"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary" aria-label="Ouvrir">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Le gérant du client ouvre ce lien, saisit son IBAN et autorise le mandat SEPA — l&apos;abonnement
              démarre alors automatiquement (prélèvement mensuel).
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Prélèvement SEPA indisponible : définissez <code>STRIPE_SECRET_KEY</code> en production pour l&apos;activer.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
