"use client";

import { useState } from "react";
import { Check, Headset } from "lucide-react";
import { FEATURES, FEATURE_GROUPS } from "@/lib/features";
import { PLANS, PLAN_ORDER, featuresForFormule, euros, type FormuleKey } from "@/lib/plans";
import { cn } from "@/lib/utils";

const GROUP_LABEL: Record<string, string> = {
  "Cœur": "Cœur métier & conformité",
  "Modules avancés": "Modules avancés (options)",
  "Support": "Support",
};

/**
 * Choix de la formule + personnalisation des fonctionnalités (ajout/retrait).
 * Émet des champs cachés `formule` et `feat_<clé>` lus par les server actions
 * createOrganisme / updateOrganisme.
 */
export function FormuleSelector({
  defaultFormule = "MEDIUM",
  defaultFeatures,
}: {
  defaultFormule?: FormuleKey | null;
  defaultFeatures?: string[];
}) {
  const [formule, setFormule] = useState<FormuleKey | null>(defaultFormule ?? null);
  const [feats, setFeats] = useState<Set<string>>(
    () => new Set(defaultFeatures ?? (defaultFormule ? featuresForFormule(defaultFormule) : [])),
  );

  const pickFormule = (key: FormuleKey) => {
    setFormule(key);
    setFeats(new Set(featuresForFormule(key))); // réinitialise au bundle de la formule
  };
  const toggle = (key: string) =>
    setFeats((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <div className="space-y-5">
      {/* champs soumis */}
      <input type="hidden" name="formule" value={formule ?? ""} />
      {[...feats].map((k) => (
        <input key={k} type="hidden" name={`feat_${k}`} value="on" />
      ))}

      {/* 1. Formules */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">1. Formule d&apos;abonnement</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {PLAN_ORDER.map((key) => {
            const p = PLANS[key];
            const active = formule === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => pickFormule(key)}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  active ? "border-primary ring-2 ring-primary/40 bg-primary/5" : "hover:bg-muted",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold" style={{ color: p.color }}>{p.name}</span>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </div>
                <div className="mt-1 text-lg font-bold">{euros(p.price)}<span className="text-xs font-normal text-muted-foreground"> /mois</span></div>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{p.tagline}</p>
                <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Headset className="h-3 w-3" /> {p.supportLevel}
                </p>
                <p className="mt-1 text-[11px] font-medium">{p.features.length} fonctionnalités</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Personnalisation */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          2. Fonctionnalités <span className="font-normal normal-case">— ajustez à la carte ({feats.size} activées)</span>
        </p>
        {FEATURE_GROUPS.map((g) => {
          const items = FEATURES.filter((f) => f.group === g);
          if (items.length === 0) return null;
          return (
            <div key={g} className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground">{GROUP_LABEL[g] ?? g}</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((f) => {
                  const on = feats.has(f.key);
                  return (
                    <label
                      key={f.key}
                      className={cn(
                        "flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-sm transition",
                        on ? "border-primary/40 bg-primary/5" : "hover:bg-muted",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(f.key)}
                        className="mt-0.5 h-4 w-4 rounded border"
                      />
                      <span>
                        <span className="font-medium">{f.label}</span>
                        {f.description && (
                          <span className="block text-xs text-muted-foreground">{f.description}</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
