"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileSignature, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signContratFormateur } from "@/lib/actions/contrat-formateur-actions";

export function ContratSignPad({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [accept, setAccept] = useState(false);
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
  function clear() {
    const c = canvasRef.current;
    const g = ctx();
    if (c && g) g.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
  }

  function onSign() {
    if (!hasDrawn) {
      toast.error("Merci de dessiner votre signature.");
      return;
    }
    if (!accept) {
      toast.error("Merci de cocher la case d'acceptation.");
      return;
    }
    const dataUrl = canvasRef.current?.toDataURL("image/png") ?? "";
    startTransition(async () => {
      const res = await signContratFormateur(token, dataUrl);
      if (res.ok) {
        toast.success("Contrat signé. Merci !");
        router.refresh();
      } else {
        toast.error(res.error ?? "Erreur.");
      }
    });
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <p className="text-sm font-medium">Votre signature :</p>
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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={clear}
        className="w-fit text-muted-foreground"
      >
        <Eraser className="mr-1 h-3.5 w-3.5" /> Effacer
      </Button>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          checked={accept}
          onChange={(e) => setAccept(e.target.checked)}
        />
        <span>
          J&apos;ai lu et j&apos;accepte les termes du présent contrat de
          sous-traitance. Ma signature manuscrite, horodatée (IP enregistrée), a
          valeur de signature.
        </span>
      </label>
      <Button onClick={onSign} disabled={isPending} className="w-full">
        <FileSignature className="mr-2 h-4 w-4" />
        {isPending ? "Signature…" : "Signer le contrat"}
      </Button>
    </div>
  );
}
