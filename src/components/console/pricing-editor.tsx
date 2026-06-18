"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Save, Star } from "lucide-react";
import { updatePlanTarifs, type PricingState } from "@/lib/actions/pricing-actions";
import type { ResolvedPlan } from "@/lib/pricing";
import type { FormuleKey } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Édition des tarifs des 3 formules. Les valeurs sont répercutées immédiatement
 * sur la vitrine publique (/tarifs) et sur le calcul du MRR du tableau de bord.
 */
export function PricingEditor({
  plans,
  popular,
}: {
  plans: ResolvedPlan[];
  popular: FormuleKey;
}) {
  const [state, formAction, isPending] = useActionState<PricingState | undefined, FormData>(
    updatePlanTarifs,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="_popular_default" value={popular} />

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.key} className="overflow-hidden">
            <div className="h-1.5 w-full" style={{ background: p.color }} />
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-bold" style={{ color: p.color }}>{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.features.length} fonctionnalités</div>
                </div>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                    "[&:has(:checked)]:border-amber-400 [&:has(:checked)]:bg-amber-50 [&:has(:checked)]:text-amber-700",
                  )}
                >
                  <input
                    type="radio"
                    name="populaire"
                    value={p.key}
                    defaultChecked={p.key === popular}
                    className="sr-only"
                  />
                  <Star className="h-3.5 w-3.5" /> Mis en avant
                </label>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`prix_${p.key}`}>Prix (€ / mois HT)</Label>
                <div className="relative">
                  <Input
                    id={`prix_${p.key}`}
                    name={`prix_${p.key}`}
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={p.price}
                    className="pr-12 text-lg font-semibold"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`tagline_${p.key}`}>Accroche</Label>
                <Textarea
                  id={`tagline_${p.key}`}
                  name={`tagline_${p.key}`}
                  defaultValue={p.tagline}
                  rows={2}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`support_${p.key}`}>Niveau de support</Label>
                <Input
                  id={`support_${p.key}`}
                  name={`support_${p.key}`}
                  defaultValue={p.supportLevel}
                  required
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {state?.error && (
        <p className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Tarifs enregistrés — mis à jour sur la vitrine et le tableau de bord.
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <p className="mr-auto text-xs text-muted-foreground">
          Modifie aussi le calcul du chiffre d&apos;affaires (MRR) du tableau de bord.
        </p>
        <Button type="submit" disabled={isPending} className="gap-2">
          <Save className="h-4 w-4" /> {isPending ? "Enregistrement…" : "Enregistrer les tarifs"}
        </Button>
      </div>
    </form>
  );
}
