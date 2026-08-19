"use client";

import { useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Pad de signature manuscrite réutilisable (souris / doigt / stylet — pointer
 * events + `touch-none`, compatible tablette et app). Émet le PNG (data URL) via
 * `onChange` à la fin de chaque tracé, et `null` quand on efface. Le parent stocke
 * la valeur. Résolution de dessin fixe (600×200) → rendu net quelle que soit la
 * largeur d'affichage.
 */
export function SignaturePad({
  onChange,
  height = 160,
}: {
  onChange: (dataUrl: string | null) => void;
  /** Hauteur d'affichage en px (le dessin reste en 600×200). */
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const drawn = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

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
    if (!drawn.current) {
      drawn.current = true;
      setHasDrawn(true);
    }
  }
  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    if (drawn.current) onChange(canvasRef.current?.toDataURL("image/png") ?? null);
  }
  function clear() {
    const c = canvasRef.current;
    const g = ctx();
    if (c && g) g.clearRect(0, 0, c.width, c.height);
    drawn.current = false;
    setHasDrawn(false);
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <div className="rounded-md border bg-white">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="w-full touch-none rounded-md"
          style={{ touchAction: "none", height }}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={clear}
        disabled={!hasDrawn}
        className="text-muted-foreground"
      >
        <Eraser className="mr-1 h-3.5 w-3.5" /> Effacer
      </Button>
    </div>
  );
}
