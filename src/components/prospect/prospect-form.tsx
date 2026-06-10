"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileSignature, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FINANCEMENT_LABELS,
  SOURCE_CONNAISSANCE_OPTIONS,
  DIPLOME_OPTIONS,
} from "@/lib/validators/candidat";
import { PhotoCapture } from "@/components/parcours/photo-capture";
import {
  submitProspectForm,
  type ProspectFormValues,
} from "@/lib/actions/prospect-actions";

const sx =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ProspectForm({
  token,
  defaults,
  formations,
}: {
  token: string;
  defaults: Partial<ProspectFormValues>;
  formations: { id: string; titre: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [v, setV] = useState<ProspectFormValues>({
    telephone: defaults.telephone ?? "",
    dateNaissance: defaults.dateNaissance ?? "",
    lieuNaissance: defaults.lieuNaissance ?? "",
    paysNaissance: defaults.paysNaissance ?? "",
    adresse: defaults.adresse ?? "",
    codePostal: defaults.codePostal ?? "",
    ville: defaults.ville ?? "",
    pays: defaults.pays ?? "France",
    situationPro: defaults.situationPro ?? "",
    employeur: defaults.employeur ?? "",
    posteOccupe: defaults.posteOccupe ?? "",
    dernierDiplome: defaults.dernierDiplome ?? "",
    sourceConnaissance: defaults.sourceConnaissance ?? "",
    formationSouhaiteeId: defaults.formationSouhaiteeId ?? "",
    financementType: defaults.financementType ?? "",
    photoDataUrl: defaults.photoDataUrl ?? "",
    consent: false,
  });

  const set = (k: keyof ProspectFormValues, val: string | boolean) =>
    setV((p) => ({ ...p, [k]: val }));

  // ── Signature ──
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
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
    if (!hasDrawn) setHasDrawn(true);
  }
  const endDraw = () => {
    drawing.current = false;
  };
  function clear() {
    const c = canvasRef.current;
    const g = ctx();
    if (c && g) g.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!v.consent) {
      toast.error("Merci d'accepter le traitement de vos données (RGPD).");
      return;
    }
    if (!hasDrawn) {
      toast.error("Merci de dessiner votre signature dans le cadre.");
      return;
    }
    const dataUrl = canvasRef.current?.toDataURL("image/png") ?? "";
    startTransition(async () => {
      const res = await submitProspectForm(token, v, dataUrl);
      if (res.ok) {
        toast.success("Fiche enregistrée et signée. Merci !");
        router.refresh();
      } else {
        toast.error(res.error ?? "Erreur.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Photo d'identité */}
      <PhotoCapture
        value={v.photoDataUrl || undefined}
        onChange={(dataUrl) =>
          setV((p) => ({ ...p, photoDataUrl: dataUrl ?? "" }))
        }
      />

      {/* Coordonnées */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="telephone">Téléphone</Label>
          <Input id="telephone" value={v.telephone} onChange={(e) => set("telephone", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="dateNaissance">Date de naissance</Label>
          <Input id="dateNaissance" type="date" value={v.dateNaissance} onChange={(e) => set("dateNaissance", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="lieuNaissance">Lieu de naissance</Label>
          <Input id="lieuNaissance" placeholder="Ville de naissance" value={v.lieuNaissance} onChange={(e) => set("lieuNaissance", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="paysNaissance">Pays de naissance</Label>
          <Input id="paysNaissance" placeholder="France" value={v.paysNaissance} onChange={(e) => set("paysNaissance", e.target.value)} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="adresse">Adresse</Label>
          <Input id="adresse" value={v.adresse} onChange={(e) => set("adresse", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="codePostal">Code postal</Label>
          <Input id="codePostal" value={v.codePostal} onChange={(e) => set("codePostal", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ville">Ville</Label>
          <Input id="ville" value={v.ville} onChange={(e) => set("ville", e.target.value)} />
        </div>
      </div>

      {/* Situation & diplôme */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="situationPro">Situation professionnelle</Label>
          <Input id="situationPro" placeholder="Salarié, demandeur d'emploi…" value={v.situationPro} onChange={(e) => set("situationPro", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="employeur">Employeur (le cas échéant)</Label>
          <Input id="employeur" value={v.employeur} onChange={(e) => set("employeur", e.target.value)} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="dernierDiplome">Dernier diplôme obtenu</Label>
          <Input id="dernierDiplome" list="diplome-options" placeholder="Choisissez ou saisissez…" value={v.dernierDiplome} onChange={(e) => set("dernierDiplome", e.target.value)} />
          <datalist id="diplome-options">
            {DIPLOME_OPTIONS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Formation & financement */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="formationSouhaiteeId">Formation qui vous intéresse</Label>
          <select id="formationSouhaiteeId" className={sx} value={v.formationSouhaiteeId} onChange={(e) => set("formationSouhaiteeId", e.target.value)}>
            <option value="">— Sélectionnez —</option>
            {formations.map((f) => (
              <option key={f.id} value={f.id}>
                {f.titre}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="financementType">Mode de financement</Label>
          <select id="financementType" className={sx} value={v.financementType} onChange={(e) => set("financementType", e.target.value)}>
            <option value="">À préciser</option>
            {Object.entries(FINANCEMENT_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sourceConnaissance">Comment nous avez-vous connus ?</Label>
          <Input id="sourceConnaissance" list="source-options" placeholder="TikTok, Google, recommandation…" value={v.sourceConnaissance} onChange={(e) => set("sourceConnaissance", e.target.value)} />
          <datalist id="source-options">
            {SOURCE_CONNAISSANCE_OPTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Signature */}
      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <Label>Votre signature (dessinez avec le doigt ou la souris)</Label>
        <div className="rounded-md border bg-white">
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={endDraw}
            onPointerLeave={endDraw}
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
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          checked={v.consent}
          onChange={(e) => set("consent", e.target.checked)}
        />
        <span>
          J&apos;atteste l&apos;exactitude des informations fournies et j&apos;accepte
          leur traitement dans le cadre de mon inscription (RGPD). Ma signature
          manuscrite, horodatée, a la même valeur qu&apos;une signature sur papier
          (adresse IP enregistrée). *
        </span>
      </label>

      <Button type="submit" className="w-full" disabled={isPending}>
        <FileSignature className="mr-2 h-4 w-4" />
        {isPending ? "Enregistrement…" : "Valider et signer ma fiche"}
      </Button>
    </form>
  );
}
