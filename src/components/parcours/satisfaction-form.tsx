"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  SATISFACTION_CRITERES,
  SATISFACTION_NOTES,
} from "@/lib/satisfaction";
import { submitSatisfaction } from "@/lib/actions/parcours-actions";

export function SatisfactionForm({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<string, number>>({});
  const [recommander, setRecommander] = useState<number>(8);
  const [commentaire, setCommentaire] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Object.keys(notes).length < SATISFACTION_CRITERES.length) {
      toast.error("Merci de noter tous les critères.");
      return;
    }
    startTransition(async () => {
      const res = await submitSatisfaction(token, {
        notes,
        recommander,
        commentaire,
      });
      if (res.ok) {
        toast.success("Merci pour votre retour !");
        router.refresh();
      } else {
        toast.error(res.error ?? "Erreur.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-4">
        {SATISFACTION_CRITERES.map((crit) => (
          <div key={crit.key} className="space-y-1.5">
            <p className="text-sm font-medium">{crit.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {SATISFACTION_NOTES.map((n) => {
                const active = notes[crit.key] === n.value;
                return (
                  <button
                    key={n.value}
                    type="button"
                    onClick={() =>
                      setNotes((p) => ({ ...p, [crit.key]: n.value }))
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input hover:bg-muted"
                    }`}
                  >
                    {n.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">
          Recommanderiez-vous cette formation ? (0 à 10) :{" "}
          <span className="font-bold text-primary">{recommander}</span>
        </p>
        <input
          type="range"
          min={0}
          max={10}
          value={recommander}
          onChange={(e) => setRecommander(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="commentaire" className="text-sm font-medium">
          Commentaires / suggestions
        </label>
        <Textarea
          id="commentaire"
          rows={3}
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Envoi…" : "Envoyer mon évaluation"}
      </Button>
    </form>
  );
}
