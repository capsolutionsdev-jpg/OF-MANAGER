"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { envoyerMessageCandidat, marquerMessagesLusCandidat } from "@/lib/actions/candidat-portal-actions";

type Msg = { id: string; corps: string; deCandidat: boolean; auteurNom: string | null; createdAt: string };

export function MessagerieCandidat({ messages, orgNom }: { messages: Msg[]; orgNom: string }) {
  const router = useRouter();
  const [corps, setCorps] = useState("");
  const [isPending, startTransition] = useTransition();

  // Marque les messages de l'OF comme lus à l'ouverture.
  useEffect(() => {
    void marquerMessagesLusCandidat();
  }, []);

  function send() {
    if (!corps.trim()) return;
    startTransition(async () => {
      const r = await envoyerMessageCandidat(corps);
      if (r.ok) { setCorps(""); router.refresh(); }
      else toast.error(r.error);
    });
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border bg-card p-4">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucun message. Posez votre question à {orgNom} ci-dessous.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.deCandidat ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                m.deCandidat ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                <p className="whitespace-pre-wrap">{m.corps}</p>
                <p className={`mt-1 text-[10px] ${m.deCandidat ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {m.deCandidat ? "Vous" : m.auteurNom || orgNom} · {fmt(m.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-end gap-2">
        <Textarea rows={2} value={corps} onChange={(e) => setCorps(e.target.value)}
          placeholder="Écrivez votre message…"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(); }} />
        <Button onClick={send} disabled={isPending || !corps.trim()}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
