"use client";

import { useState } from "react";
import { ChevronDown, Mail, MessageSquare, Zap } from "lucide-react";
import {
  AUTOMATION_EVENTS,
  AUTOMATION_VARS,
  type AutomationsConfig,
  type AutomationRule,
  type Canal,
} from "@/lib/automations";

export function AutomationMatrix({ defaultConfig }: { defaultConfig: AutomationsConfig }) {
  const [cfg, setCfg] = useState<AutomationsConfig>(defaultConfig ?? {});
  const [open, setOpen] = useState<string | null>(null);

  const rule = (k: string): AutomationRule => cfg[k] ?? {};
  const patch = (k: string, p: Partial<AutomationRule>) =>
    setCfg((c) => ({ ...c, [k]: { ...(c[k] ?? {}), ...p } }));

  const isOn = (k: string, def: boolean) => rule(k).on ?? def;
  const channel = (k: string): Canal => rule(k).channel ?? "email";

  return (
    <div className="space-y-2">
      <input type="hidden" name="automationsConfig" value={JSON.stringify(cfg)} />

      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Événement / déclencheur</span>
        <span className="text-center">Actif</span>
        <span className="text-center">Canal</span>
        <span className="text-center">Modèle</span>
      </div>

      {AUTOMATION_EVENTS.map((ev) => {
        const on = isOn(ev.key, ev.defaultOn);
        const ch = channel(ev.key);
        const expanded = open === ev.key;
        return (
          <div key={ev.key} className="rounded-lg border">
            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 p-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Zap className="h-3.5 w-3.5 text-primary" /> {ev.label}
                </div>
                <div className="text-xs text-muted-foreground">{ev.quand}</div>
              </div>

              {/* Actif */}
              <label className="relative inline-flex cursor-pointer items-center justify-self-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={on}
                  onChange={(e) => patch(ev.key, { on: e.target.checked })}
                />
                <span className="h-5 w-9 rounded-full bg-muted transition peer-checked:bg-primary" />
                <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4" />
              </label>

              {/* Canal */}
              <select
                value={ch}
                disabled={!on}
                onChange={(e) => patch(ev.key, { channel: e.target.value as Canal })}
                className="h-8 justify-self-center rounded-md border bg-transparent px-2 text-xs disabled:opacity-40"
              >
                <option value="email">E-mail</option>
                {ev.smsable && <option value="sms">SMS</option>}
                {ev.smsable && <option value="both">E-mail + SMS</option>}
              </select>

              {/* Modèle */}
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : ev.key)}
                disabled={!on}
                className="inline-flex items-center gap-1 justify-self-center rounded-md border px-2 py-1.5 text-xs hover:bg-muted disabled:opacity-40"
              >
                Éditer <ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? "rotate-180" : ""}`} />
              </button>
            </div>

            {expanded && on && (
              <div className="space-y-2 border-t bg-muted/30 p-3">
                {(ch === "email" || ch === "both") && (
                  <>
                    <div className="grid gap-1">
                      <label className="text-xs font-medium flex items-center gap-1"><Mail className="h-3 w-3" /> Objet de l'e-mail</label>
                      <input
                        value={rule(ev.key).subject ?? ""}
                        onChange={(e) => patch(ev.key, { subject: e.target.value })}
                        placeholder="Laisser vide = modèle par défaut"
                        className="h-8 rounded-md border bg-background px-2 text-sm"
                      />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-xs font-medium">Corps de l'e-mail</label>
                      <textarea
                        value={rule(ev.key).body ?? ""}
                        onChange={(e) => patch(ev.key, { body: e.target.value })}
                        rows={4}
                        placeholder="Laisser vide = modèle par défaut"
                        className="rounded-md border bg-background px-2 py-1.5 text-sm"
                      />
                    </div>
                  </>
                )}
                {(ch === "sms" || ch === "both") && (
                  <div className="grid gap-1">
                    <label className="text-xs font-medium flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Texte du SMS</label>
                    <textarea
                      value={rule(ev.key).body ?? ""}
                      onChange={(e) => patch(ev.key, { body: e.target.value })}
                      rows={2}
                      placeholder="160 caractères conseillés"
                      className="rounded-md border bg-background px-2 py-1.5 text-sm"
                    />
                  </div>
                )}
                {ev.key === "convocation" && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium">Envoyer</span>
                    <input
                      type="number"
                      min={1}
                      value={rule(ev.key).delayDays ?? 7}
                      onChange={(e) => patch(ev.key, { delayDays: Number(e.target.value) })}
                      className="h-7 w-16 rounded-md border bg-background px-2"
                    />
                    <span>jours avant le début</span>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Variables : {AUTOMATION_VARS.join("  ")}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
