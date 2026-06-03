"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eraser } from "lucide-react";
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
  function clearSig() {
    const c = canvasRef.current;
    const g = ctx();
    if (c && g) g.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Object.keys(notes).length < SATISFACTION_CRITERES.length) {
      toast.error("Merci de noter tous les critères.");
      return;
    }
    if (!hasDrawn) {
      toast.error("Merci de dessiner votre signature.");
      return;
    }
    const signature = canvasRef.current?.toDataURL("image/png") ?? "";
    startTransition(async () => {
      const res = await submitSatisfaction(
        token,
        { notes, recommander, commentaire },
        signature,
      );
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

      <div className="space-y-1.5">
        <p className="text-sm font-medium">
          Votre signature (dessinez avec le doigt ou la souris)
        </p>
        <div className="rounded-md border bg-white">
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            className="h-[150px] w-full touch-none rounded-md"
            style={{ touchAction: "none" }}
          />
        </div>
        <button
          type="button"
          onClick={clearSig}
          className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Eraser className="h-3.5 w-3.5" /> Effacer
        </button>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Envoi…" : "Signer et envoyer mon évaluation"}
      </Button>
    </form>
  );
}
