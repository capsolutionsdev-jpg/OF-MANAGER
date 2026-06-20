"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SITUATIONS, LIEN_FORMATION, EMPLOI_KEYS } from "@/lib/suivi6mois";
import { submitSuivi6Mois } from "@/lib/actions/parcours-actions";

export function SuiviForm({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [situation, setSituation] = useState("");
  const [lienFormation, setLienFormation] = useState("");
  const [intitulePoste, setIntitulePoste] = useState("");
  const [employeur, setEmployeur] = useState("");
  const [apportFormation, setApportFormation] = useState(7);
  const [commentaire, setCommentaire] = useState("");
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const enEmploi = EMPLOI_KEYS.has(situation);
  const ctx = () => canvasRef.current?.getContext("2d") ?? null;
  function coords(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault(); const g = ctx(); if (!g) return;
    drawing.current = true; canvasRef.current!.setPointerCapture(e.pointerId);
    g.lineWidth = 2.5; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#111";
    const { x, y } = coords(e); g.beginPath(); g.moveTo(x, y);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return; e.preventDefault();
    const g = ctx(); if (!g) return;
    const { x, y } = coords(e); g.lineTo(x, y); g.stroke();
    if (!hasDrawn) setHasDrawn(true);
  }
  const end = () => { drawing.current = false; };
  function clearSig() {
    const c = canvasRef.current, g = ctx();
    if (c && g) g.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!situation) { toast.error("Merci d'indiquer votre situation actuelle."); return; }
    if (enEmploi && !lienFormation) { toast.error("Précisez si l'emploi est en lien avec la formation."); return; }
    if (!hasDrawn) { toast.error("Merci de dessiner votre signature."); return; }
    const signature = canvasRef.current?.toDataURL("image/png") ?? "";
    startTransition(async () => {
      const res = await submitSuivi6Mois(
        token,
        {
          situation,
          lienFormation: enEmploi ? lienFormation : undefined,
          intitulePoste: enEmploi ? intitulePoste : undefined,
          employeur: enEmploi ? employeur : undefined,
          apportFormation,
          commentaire,
        },
        signature,
      );
      if (res.ok) { toast.success("Merci, votre réponse a bien été enregistrée !"); router.refresh(); }
      else toast.error(res.error ?? "Erreur.");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium">Quelle est votre situation professionnelle aujourd&apos;hui ?</p>
        <div className="grid grid-cols-1 gap-1.5">
          {SITUATIONS.map((s) => (
            <label key={s.key} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${situation === s.key ? "border-primary bg-primary/5" : ""}`}>
              <input type="radio" name="situation" value={s.key} checked={situation === s.key}
                onChange={() => setSituation(s.key)} className="h-4 w-4" />
              {s.label}
            </label>
          ))}
        </div>
      </div>

      {enEmploi && (
        <div className="space-y-4 rounded-lg border bg-muted/20 p-3">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Cet emploi est-il en lien avec la formation suivie ?</p>
            <div className="flex flex-wrap gap-1.5">
              {LIEN_FORMATION.map((l) => (
                <button key={l.key} type="button" onClick={() => setLienFormation(l.key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${lienFormation === l.key ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-muted"}`}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="poste">Intitulé du poste</label>
              <Input id="poste" value={intitulePoste} onChange={(e) => setIntitulePoste(e.target.value)} placeholder="ex. Agent de sécurité" />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="employeur">Employeur (facultatif)</label>
              <Input id="employeur" value={employeur} onChange={(e) => setEmployeur(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-sm font-medium">
          La formation vous a-t-elle aidé·e dans votre parcours ? (0 à 10) : <span className="font-bold text-primary">{apportFormation}</span>
        </p>
        <input type="range" min={0} max={10} value={apportFormation} onChange={(e) => setApportFormation(Number(e.target.value))} className="w-full" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="commentaire" className="text-sm font-medium">Commentaire (facultatif)</label>
        <Textarea id="commentaire" rows={3} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Votre signature (doigt ou souris)</p>
        <div className="rounded-md border bg-white">
          <canvas ref={canvasRef} width={600} height={200}
            onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}
            className="h-[150px] w-full touch-none rounded-md" style={{ touchAction: "none" }} />
        </div>
        <button type="button" onClick={clearSig} className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <Eraser className="h-3.5 w-3.5" /> Effacer
        </button>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Envoi…" : "Signer et envoyer ma réponse"}
      </Button>
    </form>
  );
}
