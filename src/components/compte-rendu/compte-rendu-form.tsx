"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eraser } from "lucide-react";
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
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const set = (k: string, v: string) => setRep((p) => ({ ...p, [k]: v }));

  function ctx() {
    return canvasRef.current?.getContext("2d") ?? null;
  }
  function coords(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (c.width / r.width),
      y: (e.clientY - r.top) * (c.height / r.height),
    };
  }
  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
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
  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    e.preventDefault();
    const g = ctx();
    if (!g) return;
    const { x, y } = coords(e);
    g.lineTo(x, y);
    g.stroke();
    if (!hasDrawn) setHasDrawn(true);
  }
  function endDraw() {
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
    if (!hasDrawn) {
      toast.error("Merci de dessiner votre signature.");
      return;
    }
    const dataUrl = canvasRef.current?.toDataURL("image/png") ?? "";
    startTransition(async () => {
      const res = await submitCompteRendu(token, rep, dataUrl);
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

      <div className="grid gap-1.5">
        <Label>Votre signature (dessinez avec le doigt ou la souris)</Label>
        <div className="rounded-md border bg-white">
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            onPointerDown={startDraw}
            onPointerMove={moveDraw}
            onPointerUp={endDraw}
            onPointerLeave={endDraw}
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
        {isPending ? "Envoi…" : "Signer et envoyer mon compte rendu"}
      </Button>
    </form>
  );
}
