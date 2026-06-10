"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitSatisfactionEntreprise } from "@/lib/actions/parcours-actions";

// Critères repris de la trame « Collecte des appréciations de l'entreprise » (Qualiopi ind. 30)
const CRITERES = [
  "Qualité des documents transmis",
  "Rythme de réponse",
  "Qualité des échanges / relationnel",
  "Délais de facturation",
  "Respect de la procédure",
  "Compétences acquises durant la formation",
  "Utilisation des compétences dans votre activité",
];
const NOTES = ["Très bien", "Bien", "Assez bien", "Insuffisant"];

export function SatisfactionEntrepriseForm({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [competences, setCompetences] = useState("");
  const [objectifsAtteints, setObjectifsAtteints] = useState("");
  const [avisGlobal, setAvisGlobal] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [remplisseur, setRemplisseur] = useState("");
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
    if (Object.keys(notes).length < CRITERES.length) {
      toast.error("Merci de noter tous les critères.");
      return;
    }
    if (!hasDrawn) {
      toast.error("Merci de dessiner votre signature (cachet/visa de l'entreprise).");
      return;
    }
    const signature = canvasRef.current?.toDataURL("image/png");
    startTransition(async () => {
      const res = await submitSatisfactionEntreprise(
        token,
        { notes, competences, objectifsAtteints, avisGlobal, suggestions, remplisseur },
        signature,
      );
      if (res.ok) {
        toast.success("Merci pour votre retour !");
        router.refresh();
      } else {
        toast.error(res.error ?? "Une erreur est survenue.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {CRITERES.map((c) => (
          <div key={c} className="space-y-1.5">
            <p className="text-sm font-medium">{c}</p>
            <div className="flex flex-wrap gap-2">
              {NOTES.map((n) => (
                <label
                  key={n}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    notes[c] === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name={c}
                    className="sr-only"
                    checked={notes[c] === n}
                    onChange={() => setNotes((p) => ({ ...p, [c]: n }))}
                  />
                  {n}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label>Quelles compétences votre salarié(e) a-t-il/elle apportées à votre activité ?</Label>
        <textarea rows={2} className="w-full rounded-md border bg-transparent p-3 text-sm" value={competences} onChange={(e) => setCompetences(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Les objectifs fixés ont-ils été atteints ? (si non, pourquoi)</Label>
        <textarea rows={2} className="w-full rounded-md border bg-transparent p-3 text-sm" value={objectifsAtteints} onChange={(e) => setObjectifsAtteints(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Votre avis global sur les bénéfices apportés à votre activité</Label>
        <textarea rows={2} className="w-full rounded-md border bg-transparent p-3 text-sm" value={avisGlobal} onChange={(e) => setAvisGlobal(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Vos suggestions et commentaires</Label>
        <textarea rows={2} className="w-full rounded-md border bg-transparent p-3 text-sm" value={suggestions} onChange={(e) => setSuggestions(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Rempli par (nom et fonction)</Label>
        <Input value={remplisseur} onChange={(e) => setRemplisseur(e.target.value)} placeholder="ex. Mme Martin, DRH" />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Signature de l&apos;entreprise</p>
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
        {isPending ? "Envoi…" : "Valider notre évaluation"}
      </Button>
    </div>
  );
}
