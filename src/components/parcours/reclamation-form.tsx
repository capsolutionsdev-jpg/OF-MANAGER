"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Eraser, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitReclamationPublique } from "@/lib/actions/parcours-actions";

export function ReclamationForm({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition();
  const [objet, setObjet] = useState("");
  const [description, setDescription] = useState("");
  const [done, setDone] = useState(false);
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

  function submit() {
    if (!objet.trim() || !description.trim()) {
      toast.error("Merci de renseigner l'objet et la description.");
      return;
    }
    if (!hasDrawn) {
      toast.error("Merci de dessiner votre signature.");
      return;
    }
    const signature = canvasRef.current?.toDataURL("image/png");
    startTransition(async () => {
      const res = await submitReclamationPublique(token, { objet, description }, signature);
      if (res.ok) {
        setDone(true);
      } else {
        toast.error(res.error ?? "Une erreur est survenue.");
      }
    });
  }

  if (done) {
    return (
      <div className="space-y-2 py-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <p className="font-medium">Réclamation transmise.</p>
        <p className="text-sm text-muted-foreground">
          Un accusé de réception vous sera adressé sous 5 jours ouvrés, et une
          réponse argumentée sous 15 jours ouvrés maximum.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="objet">Objet de la réclamation</Label>
        <Input
          id="objet"
          value={objet}
          onChange={(e) => setObjet(e.target.value)}
          placeholder="ex. Problème d'organisation, contenu, locaux…"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description détaillée</Label>
        <textarea
          id="description"
          rows={5}
          className="w-full rounded-md border bg-transparent p-3 text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décrivez précisément la difficulté ou l'écart rencontré…"
        />
      </div>
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
        {isPending ? "Envoi…" : "Transmettre ma réclamation"}
      </Button>
    </div>
  );
}
