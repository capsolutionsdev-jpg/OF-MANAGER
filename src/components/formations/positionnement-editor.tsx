"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PositionnementQuestion } from "@/lib/positionnement";
import {
  savePositionnementQuestions,
  resetPositionnementQuestions,
} from "@/lib/actions/positionnement-actions";

export function PositionnementEditor({
  formationId,
  initial,
  estPersonnalise,
}: {
  formationId: string;
  initial: PositionnementQuestion[];
  estPersonnalise: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [questions, setQuestions] = useState<PositionnementQuestion[]>(initial);

  const maj = (idx: number, patch: Partial<PositionnementQuestion>) =>
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));

  const ajouter = () =>
    setQuestions((qs) => [
      ...qs,
      { id: `q${Date.now()}`, type: "QCU", question: "", options: ["Oui", "Non"] },
    ]);

  const supprimer = (idx: number) =>
    setQuestions((qs) => qs.filter((_, i) => i !== idx));

  function enregistrer() {
    startTransition(async () => {
      const res = await savePositionnementQuestions(formationId, questions);
      if (res.ok) {
        toast.success("Questions personnalisées enregistrées.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Erreur.");
      }
    });
  }

  function reinitialiser() {
    startTransition(async () => {
      await resetPositionnementQuestions(formationId);
      toast.success("Retour à la banque de questions automatique.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {estPersonnalise
          ? "Cette formation utilise des questions personnalisées."
          : "Cette formation utilise la banque automatique — modifiez ci-dessous puis enregistrez pour la personnaliser."}
      </p>

      {questions.map((q, idx) => (
        <div key={q.id} className="space-y-2 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-primary">Question {idx + 1}</span>
            <div className="flex items-center gap-2">
              <select
                value={q.type}
                onChange={(e) =>
                  maj(idx, {
                    type: e.target.value as PositionnementQuestion["type"],
                    options:
                      e.target.value === "COURTE"
                        ? undefined
                        : q.options?.length
                          ? q.options
                          : ["Oui", "Non"],
                  })
                }
                className="h-8 rounded-md border bg-transparent px-2 text-xs"
              >
                <option value="QCU">QCU — choix unique</option>
                <option value="QCM">QCM — choix multiples</option>
                <option value="COURTE">Réponse courte</option>
              </select>
              <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => supprimer(idx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Input
            value={q.question}
            placeholder="Intitulé de la question…"
            onChange={(e) => maj(idx, { question: e.target.value })}
          />
          {q.type !== "COURTE" && (
            <Input
              value={(q.options ?? []).join(" ; ")}
              placeholder="Options séparées par « ; » — ex. Oui ; Non ; Je ne sais pas"
              onChange={(e) => maj(idx, { options: e.target.value.split(";").map((o) => o.trim()) })}
            />
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={ajouter}>
          <Plus className="mr-1 h-4 w-4" /> Ajouter une question
        </Button>
        <Button type="button" onClick={enregistrer} disabled={isPending}>
          <Save className="mr-1 h-4 w-4" /> {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {estPersonnalise && (
          <Button type="button" variant="ghost" onClick={reinitialiser} disabled={isPending}>
            <RotateCcw className="mr-1 h-4 w-4" /> Revenir à la banque automatique
          </Button>
        )}
      </div>
    </div>
  );
}
