import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrgUsage, UsageMetric } from "@/lib/usage";

function Ligne({ label, m }: { label: string; m: UsageMetric }) {
  if (m.limit == null) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {m.used} · <span className="text-xs">illimité</span>
        </span>
      </div>
    );
  }
  const bar = m.over ? "bg-red-500" : m.near ? "bg-amber-500" : "bg-emerald-500";
  const txt = m.over ? "text-red-600 dark:text-red-400" : m.near ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={txt}>
          {m.used} / {m.limit} <span className="text-xs">({m.pct}%)</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${Math.min(100, m.pct)}%` }} />
      </div>
    </div>
  );
}

/**
 * Carte « consommation du mois » (e-mails + inscriptions vs quota de la formule).
 * Présentationnelle : les données viennent de getOrgUsage() côté serveur.
 */
export function UsageCard({ usage, title = "Consommation du mois" }: { usage: OrgUsage; title?: string }) {
  const alerte = usage.emails.over || usage.inscriptions.over
    ? "over"
    : usage.emails.near || usage.inscriptions.near
      ? "near"
      : null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          {title}{" "}
          <span className="font-normal capitalize text-muted-foreground">— {usage.moisLabel}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Ligne label="E-mails envoyés" m={usage.emails} />
        <Ligne label="Inscriptions (élèves)" m={usage.inscriptions} />
        {alerte && (
          <p className={`flex items-start gap-1.5 text-xs ${alerte === "over" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {alerte === "over"
                ? "Palier mensuel dépassé — passez à la formule supérieure pour éviter la facturation du dépassement."
                : "Vous approchez de la limite mensuelle de votre formule."}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
