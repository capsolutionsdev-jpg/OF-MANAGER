"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { repondreMessageCandidat } from "@/lib/actions/candidat-portal-actions";

type Msg = { id: string; corps: string; deCandidat: boolean; auteurNom: string | null; createdAt: string };

/** Fil de messagerie candidat ↔ organisme, côté OF (fiche candidat). */
export function CandidatMessagerie({ candidatId, messages }: { candidatId: string; messages: Msg[] }) {
  const router = useRouter();
  const [corps, setCorps] = useState("");
  const [isPending, startTransition] = useTransition();

  function send() {
    if (!corps.trim()) return;
    startTransition(async () => {
      const r = await repondreMessageCandidat(candidatId, corps);
      if (r.ok) { setCorps(""); router.refresh(); }
      else toast.error(r.error);
    });
  }
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-3">
      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun message échangé avec ce candidat.</p>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.deCandidat ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${m.deCandidat ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                <p className="whitespace-pre-wrap">{m.corps}</p>
                <p className={`mt-0.5 text-[10px] ${m.deCandidat ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                  {m.deCandidat ? "Candidat" : m.auteurNom || "Vous"} · {fmt(m.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <Textarea rows={2} value={corps} onChange={(e) => setCorps(e.target.value)} placeholder="Répondre au candidat…" />
        <Button onClick={send} disabled={isPending || !corps.trim()}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
