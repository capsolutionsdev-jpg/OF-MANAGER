"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Eraser, PenLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signMyEmargement } from "@/lib/actions/apprenant-actions";

export type EmargementItem = {
  id: string;
  dateLabel: string;
  demiLabel: string;
  formation: string;
  signed: boolean;
};

export function EmargementSignList({ items }: { items: EmargementItem[] }) {
  const [signing, setSigning] = useState<string | null>(null);
  const aSigner = items.filter((i) => !i.signed);
  const signes = items.filter((i) => i.signed);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">À signer ({aSigner.length})</h2>
        {aSigner.length === 0 ? (
          <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            Aucune feuille d&apos;émargement en attente. ✓
          </p>
        ) : (
          <ul className="space-y-2">
            {aSigner.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{i.dateLabel} — {i.demiLabel}</p>
                  <p className="truncate text-xs text-muted-foreground">{i.formation}</p>
                </div>
                <Button size="sm" onClick={() => setSigning(i.id)}>
                  <PenLine className="mr-1.5 h-4 w-4" /> Signer
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {signes.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Signées ({signes.length})</h2>
          <ul className="space-y-1">
            {signes.map((i) => (
              <li key={i.id} className="flex items-center gap-2 rounded-md bg-emerald-500/5 px-3 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{i.dateLabel} — {i.demiLabel}</span>
                <span className="truncate text-xs text-muted-foreground">· {i.formation}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {signing && (
        <SignModal
          item={items.find((i) => i.id === signing)!}
          onClose={() => setSigning(null)}
        />
      )}
    </div>
  );
}

function SignModal({ item, onClose }: { item: EmargementItem; onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const ctx = () => canvasRef.current?.getContext("2d") ?? null;
  function coords(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const g = ctx(); if (!g) return;
    drawing.current = true;
    canvasRef.current!.setPointerCapture(e.pointerId);
    g.lineWidth = 2.5; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#111";
    const { x, y } = coords(e); g.beginPath(); g.moveTo(x, y);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    e.preventDefault();
    const g = ctx(); if (!g) return;
    const { x, y } = coords(e); g.lineTo(x, y); g.stroke();
    if (!hasDrawn) setHasDrawn(true);
  }
  const end = () => { drawing.current = false; };
  function clear() {
    const c = canvasRef.current, g = ctx();
    if (c && g) g.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
  }
  function sign() {
    if (!hasDrawn) { toast.error("Dessinez votre signature dans le cadre."); return; }
    const dataUrl = canvasRef.current?.toDataURL("image/png") ?? "";
    startTransition(async () => {
      const res = await signMyEmargement(item.id, dataUrl);
      if (res.ok) { toast.success("Émargement signé !"); onClose(); router.refresh(); }
      else toast.error(res.error ?? "Erreur.");
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md space-y-4 rounded-xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold">Signer l&apos;émargement</h3>
            <p className="text-sm text-muted-foreground">{item.dateLabel} — {item.demiLabel}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="rounded-md border bg-white">
          <canvas
            ref={canvasRef} width={600} height={200}
            onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}
            className="h-[160px] w-full touch-none rounded-md" style={{ touchAction: "none" }}
          />
        </div>
        <div className="flex items-center justify-between">
          <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <Eraser className="h-3.5 w-3.5" /> Effacer
          </button>
          <Button onClick={sign} disabled={isPending}>
            <PenLine className="mr-1.5 h-4 w-4" /> {isPending ? "Signature…" : "Signer"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Votre signature manuscrite, horodatée (IP enregistrée), a la même valeur qu&apos;une signature papier.
        </p>
      </div>
    </div>
  );
}
