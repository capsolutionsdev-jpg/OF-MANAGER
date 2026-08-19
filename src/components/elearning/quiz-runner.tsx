"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HelpCircle, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type LeconQuizItem } from "@/lib/validators/cours";
import { submitQuizResultat } from "@/lib/actions/learning-actions";

export function QuizRunner({
  leconId,
  quiz,
  previous,
}: {
  leconId: string;
  quiz: LeconQuizItem[];
  previous: { score: number; total: number } | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // réponses : pour QCU/QCM → indices choisis ; REDIGEE → texte
  const [answers, setAnswers] = useState<Record<number, number[] | string>>({});
  const [submitted, setSubmitted] = useState(false);

  const notes = quiz.filter((q) => q.type !== "REDIGEE");
  const total = notes.length;

  function score(): number {
    let s = 0;
    quiz.forEach((q, i) => {
      if (q.type === "REDIGEE") return;
      const chosen = (answers[i] as number[]) ?? [];
      const correct = q.bonnes;
      const ok =
        chosen.length === correct.length &&
        chosen.every((c) => correct.includes(c));
      if (ok) s += 1;
    });
    return s;
  }

  function toggle(qi: number, oi: number, type: string) {
    setAnswers((prev) => {
      const cur = (prev[qi] as number[]) ?? [];
      if (type === "QCU") return { ...prev, [qi]: [oi] };
      return {
        ...prev,
        [qi]: cur.includes(oi) ? cur.filter((x) => x !== oi) : [...cur, oi],
      };
    });
  }

  function submit() {
    setSubmitted(true);
    // On envoie les RÉPONSES (indices choisis) ; le score est recalculé côté
    // serveur (source de vérité). Les questions rédigées ne sont pas notées.
    const reponses: Record<number, number[]> = {};
    quiz.forEach((q, i) => {
      if (q.type === "REDIGEE") return;
      reponses[i] = (answers[i] as number[]) ?? [];
    });
    startTransition(async () => {
      const res = await submitQuizResultat(leconId, reponses);
      if (!res.ok) toast.error(res.error ?? "Erreur.");
      else {
        toast.success(`Quiz validé : ${res.score ?? score()}/${res.total ?? total}`);
        router.refresh();
      }
    });
  }

  function reset() {
    setAnswers({});
    setSubmitted(false);
  }

  const s = submitted ? score() : 0;

  return (
    <div className="rounded-xl border bg-muted/20 p-5">
      <h3 className="mb-1 flex items-center gap-2 font-semibold text-foreground">
        <HelpCircle className="h-4 w-4 text-warning" /> Quiz
      </h3>
      {previous && !submitted && (
        <p className="mb-3 text-xs text-muted-foreground">
          Dernier score : {previous.score}/{previous.total}
        </p>
      )}

      <div className="space-y-5">
        {quiz.map((q, qi) => {
          const chosen = (answers[qi] as number[]) ?? [];
          return (
            <div key={qi}>
              <p className="mb-2 text-sm font-medium">
                {qi + 1}. {q.enonce}
                {q.type === "QCM" && (
                  <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                    (plusieurs réponses)
                  </span>
                )}
              </p>

              {q.type === "REDIGEE" ? (
                <div>
                  <textarea
                    className="w-full rounded-md border border-input bg-background p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                    rows={3}
                    placeholder="Votre réponse…"
                    value={(answers[qi] as string) ?? ""}
                    onChange={(e) => setAnswers((p) => ({ ...p, [qi]: e.target.value }))}
                  />
                  {submitted && q.corrige && (
                    <p className="mt-1 rounded bg-success/10 p-2 text-xs text-success">
                      <strong>Corrigé : </strong>
                      {q.corrige}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => {
                    const isChosen = chosen.includes(oi);
                    const isCorrect = q.bonnes.includes(oi);
                    let cls = "border-input bg-background";
                    if (submitted) {
                      if (isCorrect) cls = "border-success/50 bg-success/10";
                      else if (isChosen) cls = "border-destructive/50 bg-destructive/10";
                    } else if (isChosen) {
                      cls = "border-primary bg-primary/10";
                    }
                    return (
                      <button
                        key={oi}
                        type="button"
                        disabled={submitted}
                        onClick={() => toggle(qi, oi, q.type)}
                        className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${cls}`}
                      >
                        <span
                          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[10px] ${
                            isChosen ? "border-primary" : "border-muted-foreground/40"
                          }`}
                        >
                          {String.fromCharCode(65 + oi)}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {submitted && isCorrect && (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        )}
                        {submitted && isChosen && !isCorrect && (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between">
        {submitted ? (
          <>
            <span className="text-sm font-semibold">
              Score : {s}/{total}{" "}
              {total > 0 && (
                <span className="text-muted-foreground">
                  ({Math.round((s / total) * 100)}%)
                </span>
              )}
            </span>
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-4 w-4" /> Refaire
            </Button>
          </>
        ) : (
          <Button onClick={submit} disabled={isPending}>
            Valider le quiz
          </Button>
        )}
      </div>
    </div>
  );
}
