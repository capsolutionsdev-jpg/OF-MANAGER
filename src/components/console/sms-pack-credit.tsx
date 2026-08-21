"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { crediterSmsPack } from "@/lib/actions/console-actions";
import { SMS_PACKS } from "@/lib/options";
import { euros } from "@/lib/plans";

/** Créditer un pack SMS prépayé sur un organisme (console SUPERADMIN). */
export function SmsPackCredit({ organismeId, solde }: { organismeId: string; solde: number }) {
  const [pack, setPack] = useState(SMS_PACKS[0]?.key ?? "");
  const [pending, start] = useTransition();

  const credit = () =>
    start(async () => {
      const r = await crediterSmsPack(organismeId, pack);
      toast[r.ok ? "success" : "error"](r.ok ? "Pack SMS crédité." : r.error ?? "Échec.");
    });

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-3 text-sm">
      <span className="text-muted-foreground">
        Solde SMS prépayé : <b className="text-foreground">{solde}</b>
      </span>
      <select
        value={pack}
        onChange={(e) => setPack(e.target.value)}
        className="rounded-md border bg-background px-2 py-1.5 text-xs"
        aria-label="Pack SMS"
      >
        {SMS_PACKS.map((p) => (
          <option key={p.key} value={p.key}>{p.sms} SMS — {euros(p.prix)}</option>
        ))}
      </select>
      <Button size="sm" variant="outline" onClick={credit} disabled={pending}>
        {pending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" />}
        Créditer
      </Button>
    </div>
  );
}
