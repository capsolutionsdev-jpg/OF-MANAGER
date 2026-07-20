"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PositionnementQuestion } from "@/lib/positionnement";
import { submitPositionnement } from "@/lib/actions/parcours-actions";

type SubmitAction = (
  token: string,
  reponses: Record<string, string | string[]>,
  signature?: string,
) => Promise<{ ok: boolean; error?: string }>;

export function PositionnementForm({
  token,
  questions,
  action = submitPositionnement,
  submitLabel = "Valider mon test de positionnement",
  successLabel = "Test de positionnement enregistré, merci !",
}: {
  token: string;
  questions: PositionnementQuestion[];
  action?: SubmitAction;
  submitLabel?: string;
  successLabel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reponses, setReponses] = useState<Record<string, string | string[]>>({});
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const ctx = () => canvasRef.current?.getContext("2d") ?? null;
  function coords(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (c.width / r.width),
      y: (e.clientY - r.top) * (c.height / r.height),
    };
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const g = ctx();
    if (!g) return;
    drawing.current = true;
    canvasRef.current!.setPointerCapture(e.pointerId);
    g.lineWidth = 2.5;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.strokeStyle = "#111";
    const { x, y } = coords(e);
    g.beginPath();
    g.moveTo(x, y);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    e.preventDefault();
    const g = ctx();
    if (!g) return;
    const { x, y } = coords(e);
    g.lineTo(x, y);
    g.stroke();
    if (!hasDrawn) setHasDrawn(true);
  }
  function end() {
    drawing.current = false;
  }
  function clearPad() {
    const c = canvasRef.current;
    const g = ctx();
    if (c && g) g.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
  }

  const setQcu = (id: string, value: string) =>
    setReponses((r) => ({ ...r, [id]: value }));
  const toggleQcm = (id: string, value: string) =>
    setReponses((r) => {
      const cur = Array.isArray(r[id]) ? (r[id] as string[]) : [];
      return {
        ...r,
        [id]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value],
      };
    });
  const setCourte = (id: string, value: string) =>
    setReponses((r) => ({ ...r, [id]: value }));

  function submit() {
    const manquantes = questions.filter((q) => {
      const v = reponses[q.id];
      return q.type === "QCM"
        ? !Array.isArray(v) || v.length === 0
        : !v || String(v).trim() === "";
    });
    if (manquantes.length > 0) {
      toast.error(`Merci de répondre à toutes les questions (${manquantes.length} restante${manquantes.length > 1 ? "s" : ""}).`);
      return;
    }
    if (!hasDrawn) {
      toast.error("Merci de dessiner votre signature.");
      return;
    }
    const signature = canvasRef.current?.toDataURL("image/png");
    startTransition(async () => {
      const res = await action(token, reponses, signature);
      if (res.ok) {
        toast.success(successLabel);
        router.refresh();
      } else {
        toast.error(res.error ?? "Une erreur est survenue.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {questions.map((q, i) => (
        <div key={q.id} className="space-y-2">
          <p className="text-sm font-medium">
            <span className="mr-1 font-bold text-primary">{i + 1}.</span>
            {q.question}
            {q.type === "QCM" && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">(plusieurs réponses possibles)</span>
            )}
          </p>
          {q.type === "QCU" && q.options && (
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => (
                <label
                  key={opt}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    reponses[q.id] === opt
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    className="sr-only"
                    checked={reponses[q.id] === opt}
                    onChange={() => setQcu(q.id, opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}
          {q.type === "QCM" && q.options && (
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => {
                const checked = Array.isArray(reponses[q.id]) && (reponses[q.id] as string[]).includes(opt);
                return (
                  <label
                    key={opt}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleQcm(q.id, opt)}
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          )}
          {q.type === "COURTE" && (
            <textarea
              rows={2}
              className="w-full rounded-md border bg-transparent p-3 text-sm"
              placeholder="Votre réponse…"
              value={(reponses[q.id] as string) ?? ""}
              onChange={(e) => setCourte(q.id, e.target.value)}
            />
          )}
        </div>
      ))}

      <div className="space-y-2">
        <p className="text-sm font-medium">Votre signature</p>
        <div className="rounded-lg border bg-white">
          <canvas
            ref={canvasRef}
            width={560}
            height={160}
            className="h-40 w-full touch-none"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
          />
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={clearPad}>
          <Eraser className="mr-1 h-3.5 w-3.5" /> Effacer
        </Button>
      </div>

      <Button onClick={submit} disabled={isPending} className="w-full">
        {isPending ? "Envoi…" : submitLabel}
      </Button>
    </div>
  );
}
