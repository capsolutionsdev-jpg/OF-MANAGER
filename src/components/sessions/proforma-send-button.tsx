"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Send, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { envoyerProforma } from "@/lib/actions/proforma-actions";

export function ProformaSendButton({ sessionId, cibleKey }: { sessionId: string; cibleKey: string }) {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending || sent}
      onClick={() =>
        startTransition(async () => {
          const r = await envoyerProforma(sessionId, cibleKey);
          if (r.ok) {
            setSent(true);
            toast.success(`Proforma envoyée à ${r.to}`);
          } else {
            toast.error(r.error);
          }
        })
      }
    >
      {sent ? (
        <>
          <Check className="mr-1.5 h-4 w-4" /> Envoyée
        </>
      ) : pending ? (
        <>
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Envoi…
        </>
      ) : (
        <>
          <Send className="mr-1.5 h-4 w-4" /> Envoyer
        </>
      )}
    </Button>
  );
}
