"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PenLine, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signEmargement } from "@/lib/actions/emargement-signature-actions";

export function EmargerSignButton({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

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
  function clear() {
    const c = canvasRef.current;
    const g = ctx();
    if (c && g) g.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
  }

  function onSign() {
    if (!hasDrawn) {
      toast.error("Merci de dessiner votre signature dans le cadre.");
      return;
    }
    const dataUrl = canvasRef.current?.toDataURL("image/png") ?? "";
    startTransition(async () => {
      const res = await signEmargement(token, dataUrl);
      if (res.ok) {
        toast.success("Présence signée. Merci !");
        router.refresh();
      } else {
        toast.error(res.error ?? "Erreur.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Dessinez votre signature :</p>
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
        onClick={clear}
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Eraser className="h-3.5 w-3.5" /> Effacer
      </button>
      <Button onClick={onSign} disabled={isPending} className="w-full">
        <PenLine className="mr-2 h-4 w-4" />
        {isPending ? "Signature…" : "Signer ma présence"}
      </Button>
    </div>
  );
}
