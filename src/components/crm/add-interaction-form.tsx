"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { InteractionType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { INTERACTION_LABELS } from "@/lib/validators/crm";
import { addInteraction } from "@/lib/actions/crm-actions";

const sx =
  "h-9 rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export function AddInteractionForm({ candidatId }: { candidatId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<InteractionType>("APPEL");
  const [sujet, setSujet] = useState("");
  const [contenu, setContenu] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sujet.trim() && !contenu.trim()) {
      toast.error("Indiquez un sujet ou un contenu.");
      return;
    }
    startTransition(async () => {
      const res = await addInteraction(candidatId, type, sujet, contenu);
      if (!res.ok) {
        toast.error(res.error ?? "Erreur.");
        return;
      }
      toast.success("Échange enregistré.");
      setSujet("");
      setContenu("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap gap-2">
        <select
          className={sx}
          value={type}
          onChange={(e) => setType(e.target.value as InteractionType)}
        >
          {(Object.keys(INTERACTION_LABELS) as InteractionType[]).map((k) => (
            <option key={k} value={k}>
              {INTERACTION_LABELS[k]}
            </option>
          ))}
        </select>
        <Input
          className="flex-1"
          placeholder="Sujet (ex. Appel de relance)"
          value={sujet}
          onChange={(e) => setSujet(e.target.value)}
        />
      </div>
      <textarea
        className="min-h-[60px] w-full rounded-md border border-input bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        placeholder="Notes de l'échange…"
        value={contenu}
        onChange={(e) => setContenu(e.target.value)}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {isPending ? "Enregistrement…" : "Ajouter l'échange"}
        </Button>
      </div>
    </form>
  );
}
