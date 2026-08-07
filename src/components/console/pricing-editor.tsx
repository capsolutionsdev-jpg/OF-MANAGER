"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Save, Star, Lock } from "lucide-react";
import { updatePlanTarifs, type PricingState } from "@/lib/actions/pricing-actions";
import type { ResolvedPlan } from "@/lib/pricing";
import { EXTRA_SEAT_PRICE_EUR, type FormuleKey } from "@/lib/plans";
import { FEATURES, FEATURE_GROUPS, type Feature } from "@/lib/features";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SUPPORT_KEY = "support"; // toujours inclus

const GROUP_LABEL: Record<string, string> = {
  "Cœur": "Cœur métier & conformité",
  "Modules avancés": "Modules avancés",
  "Support": "Support",
};

/**
 * Édition des formules : prix, nom, accroche, support, mise en avant ET
 * composition des fonctionnalités. Répercuté en direct sur la vitrine (/tarifs)
 * et le calcul du MRR du tableau de bord.
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

  // Noms (contrôlés) pour synchroniser les en-têtes de la matrice en direct.
  const [names, setNames] = useState<Record<string, string>>(
    () => Object.fromEntries(plans.map((p) => [p.key, p.name])),
  );
  // Composition par formule (support toujours présent).
  const [feats, setFeats] = useState<Record<string, Set<string>>>(
    () => Object.fromEntries(plans.map((p) => [p.key, new Set([...p.features, SUPPORT_KEY])])),
  );

  const toggle = (key: string, fk: string) =>
    setFeats((prev) => {
      const next = new Set(prev[key]);
      if (next.has(fk)) next.delete(fk);
      else next.add(fk);
      next.add(SUPPORT_KEY); // garde-fou
      return { ...prev, [key]: next };
    });

  return (
    <form action={formAction} className="space-y-6">
      {/* champs cachés de composition (cases cochées) */}
      {plans.map((p) =>
        [...feats[p.key]].map((fk) => (
          <input key={`${p.key}-${fk}`} type="hidden" name={`feat_${p.key}_${fk}`} value="on" />
        )),
      )}

      {/* 1. Cartes : nom, prix, accroche, support, mise en avant */}
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.key} className="overflow-hidden">
            <div className="h-1.5 w-full" style={{ background: p.color }} />
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`nom_${p.key}`}>Nom de la formule</Label>
                  <Input
                    id={`nom_${p.key}`}
                    name={`nom_${p.key}`}
                    value={names[p.key] ?? ""}
                    onChange={(e) => setNames((n) => ({ ...n, [p.key]: e.target.value }))}
                    className="font-semibold"
                    style={{ color: p.color }}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">{feats[p.key].size} fonctionnalités · clé interne {p.key}</p>
                </div>
                <label
                  className={cn(
                    "mt-6 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                    "[&:has(:checked)]:border-amber-400 [&:has(:checked)]:bg-amber-50 dark:bg-amber-500/10 [&:has(:checked)]:text-amber-700 dark:text-amber-300",
                  )}
                >
                  <input type="radio" name="populaire" value={p.key} defaultChecked={p.key === popular} className="sr-only" />
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
                <Textarea id={`tagline_${p.key}`} name={`tagline_${p.key}`} defaultValue={p.tagline} rows={2} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`support_${p.key}`}>Niveau de support</Label>
                <Input id={`support_${p.key}`} name={`support_${p.key}`} defaultValue={p.supportLevel} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`comptes_${p.key}`}>Comptes back-office inclus</Label>
                <Input
                  id={`comptes_${p.key}`}
                  name={`comptes_${p.key}`}
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={p.maxComptes ?? 0}
                  placeholder="0 = illimité"
                />
                <p className="text-[11px] text-muted-foreground">
                  {p.maxComptes == null ? "Illimité" : `${p.maxComptes} compte(s)`} · 0 = illimité ·
                  compte supplémentaire {EXTRA_SEAT_PRICE_EUR} € HT/mois
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2. Matrice de composition : fonctionnalités × formules */}
      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-semibold">Composition des formules</h3>
          <p className="text-xs text-muted-foreground">
            Cochez les fonctionnalités incluses dans chaque formule. Reflété dans le tableau comparatif
            de la vitrine et pré-coché à la création d&apos;un compte client. Le support est toujours inclus.
          </p>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Fonctionnalité</th>
                {plans.map((p) => (
                  <th key={p.key} className="w-28 px-3 py-2 text-center">
                    <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: p.color }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                      {names[p.key] || p.key}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_GROUPS.map((g) => {
                const items = FEATURES.filter((f: Feature) => f.group === g);
                if (items.length === 0) return null;
                return (
                  <FeatureGroupRows
                    key={g}
                    label={GROUP_LABEL[g] ?? g}
                    items={items}
                    plans={plans}
                    feats={feats}
                    toggle={toggle}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {state?.error && (
        <p className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> Formules enregistrées — mises à jour sur la vitrine et le tableau de bord.
        </p>
      )}

      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-background/90 py-3 backdrop-blur">
        <p className="mr-auto text-xs text-muted-foreground">
          Nom, prix et composition modifient aussi le MRR et les comptes créés ensuite.
        </p>
        <Button type="submit" disabled={isPending} className="gap-2">
          <Save className="h-4 w-4" /> {isPending ? "Enregistrement…" : "Enregistrer les formules"}
        </Button>
      </div>
    </form>
  );
}

function FeatureGroupRows({
  label,
  items,
  plans,
  feats,
  toggle,
}: {
  label: string;
  items: Feature[];
  plans: ResolvedPlan[];
  feats: Record<string, Set<string>>;
  toggle: (key: string, fk: string) => void;
}) {
  return (
    <>
      <tr className="bg-muted/20">
        <td colSpan={1 + plans.length} className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
          {label}
        </td>
      </tr>
      {items.map((f) => {
        const locked = f.key === SUPPORT_KEY;
        return (
          <tr key={f.key} className="border-t">
            <td className="px-3 py-2">
              <span className="font-medium text-foreground">{f.label}</span>
              {f.description && <span className="block text-[11px] text-muted-foreground">{f.description}</span>}
            </td>
            {plans.map((p) => {
              const on = feats[p.key].has(f.key);
              return (
                <td key={p.key} className="px-3 py-2 text-center">
                  {locked ? (
                    <span className="inline-flex items-center justify-center text-emerald-600" title="Toujours inclus">
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(p.key, f.key)}
                      className="h-4 w-4 cursor-pointer rounded border accent-primary"
                      aria-label={`${f.label} — ${p.key}`}
                    />
                  )}
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}
