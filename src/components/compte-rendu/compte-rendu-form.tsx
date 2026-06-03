"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CR_QUESTIONS } from "@/lib/compte-rendu";
import { submitCompteRendu } from "@/lib/actions/compte-rendu-actions";

const sx =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function CompteRenduForm({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rep, setRep] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => setRep((p) => ({ ...p, [k]: v }));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await submitCompteRendu(token, rep);
      if (res.ok) {
        toast.success("Compte rendu enregistré. Merci !");
        router.refresh();
      } else {
        toast.error(res.error ?? "Erreur.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {CR_QUESTIONS.map((q) => (
        <div key={q.key} className="grid gap-1.5">
          <Label htmlFor={q.key}>{q.label}</Label>
          {q.type === "ouinon" ? (
            <select
              id={q.key}
              className={sx}
              value={rep[q.key] ?? ""}
              onChange={(e) => set(q.key, e.target.value)}
            >
              <option value="">—</option>
              <option value="OUI">OUI</option>
              <option value="NON">NON</option>
            </select>
          ) : (
            <Textarea
              id={q.key}
              rows={3}
              value={rep[q.key] ?? ""}
              onChange={(e) => set(q.key, e.target.value)}
            />
          )}
        </div>
      ))}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Envoi…" : "Envoyer mon compte rendu"}
      </Button>
    </form>
  );
}
