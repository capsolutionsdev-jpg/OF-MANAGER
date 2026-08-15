"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Rocket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { convertLeadToClient } from "@/lib/actions/console-actions";

/**
 * Convertit un prospect en client en un clic depuis sa fiche. Confirme, appelle
 * l'action, puis emmène le SUPERADMIN sur la configuration du nouveau client.
 */
export function ConvertLeadButton({ leadId, hasDemo }: { leadId: string; hasDemo: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onClick() {
    const msg = hasDemo
      ? "Convertir ce prospect en client ?\n\nSa démo sera promue en compte client — ses données et son accès sont conservés."
      : "Convertir ce prospect en client ?\n\nUne instance client pré-remplie sera créée depuis ses informations.";
    if (!window.confirm(msg)) return;
    setErr(null);
    start(async () => {
      const res = await convertLeadToClient(leadId);
      if (res.ok && res.organismeId) {
        router.push(`/console/${res.organismeId}`);
      } else {
        setErr(res.error ?? "La conversion a échoué.");
      }
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button onClick={onClick} disabled={pending} size="sm">
        {pending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Rocket className="mr-1.5 h-4 w-4" />
        )}
        Convertir en client
      </Button>
      {err && <span className="text-xs text-rose-600 dark:text-rose-400">{err}</span>}
    </div>
  );
}
