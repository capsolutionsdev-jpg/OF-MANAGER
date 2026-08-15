"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileSignature, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signContratPrestation } from "@/lib/actions/contrat-prestation-public";

/** Signature électronique interne du contrat de prestation (tracé + IP + horodatage). */
export function ContratPrestationSignForm({
  token,
  defaultName,
}: {
  token: string;
  defaultName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(defaultName);
  const [accept, setAccept] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  function ctx() {
    return canvasRef.current?.getContext("2d") ?? null;
  }
  function coords(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
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
    if (!name.trim() || name.trim().length < 2) return toast.error("Indiquez votre nom complet.");
    if (!hasDrawn) return toast.error("Merci de dessiner votre signature dans le cadre.");
    if (!accept) return toast.error("Merci de cocher la case « lu et approuvé ».");
    const dataUrl = canvasRef.current?.toDataURL("image/png") ?? "";
    startTransition(async () => {
      const res = await signContratPrestation(token, name, dataUrl);
      if (res.ok) {
        toast.success("Contrat signé. Merci !");
        router.refresh();
      } else {
        toast.error(res.error ?? "Erreur lors de la signature.");
      }
    });
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <div className="grid gap-1.5">
        <Label htmlFor="sign-name">Votre nom complet</Label>
        <Input id="sign-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Prénom NOM" />
      </div>

      <div className="grid gap-1.5">
        <Label>Votre signature (dessinez avec le doigt ou la souris)</Label>
        <div className="rounded-md border bg-white">
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            className="h-[160px] w-full touch-none rounded-md"
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
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-0.5 h-4 w-4" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
        <span>
          <b>Lu et approuvé.</b> J&apos;accepte les termes du présent contrat. Ma signature manuscrite ci-dessus,
          horodatée, a la même valeur qu&apos;une signature sur papier (adresse IP enregistrée).
        </span>
      </label>

      <Button onClick={onSign} disabled={isPending} className="w-full">
        <FileSignature className="mr-2 h-4 w-4" />
        {isPending ? "Signature en cours…" : "Signer le contrat"}
      </Button>
    </div>
  );
}
