"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles, Download, Loader2, Wand2, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { genererVisuelIA } from "@/lib/actions/social-content-actions";

const FORMATS = [
  { key: "carre", label: "Carré", hint: "1024²" },
  { key: "paysage", label: "Paysage", hint: "1536×1024" },
  { key: "story", label: "Portrait", hint: "1024×1536" },
];

export function AiImagePanel({ sessionId, configured }: { sessionId: string; configured: boolean }) {
  const [pending, start] = useTransition();
  const [format, setFormat] = useState("carre");
  const [brief, setBrief] = useState("");
  const [img, setImg] = useState<string | null>(null);

  function generate() {
    start(async () => {
      const res = await genererVisuelIA(sessionId, { format, brief });
      if (!res.ok) {
        toast.error(res.error ?? "Génération impossible.");
        return;
      }
      setImg(res.dataUri ?? null);
      toast.success("Image générée.");
    });
  }

  async function downloadImg() {
    if (!img) return;
    try {
      const blob = await (await fetch(img)).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `image-ia-${format}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Téléchargement impossible.");
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h3 className="flex items-center gap-2 font-semibold">
          <Wand2 className="size-4 text-primary" /> Image IA{" "}
          <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Génère une illustration sur le thème de la formation (sans texte), à utiliser comme visuel ou arrière-plan.
        </p>
      </div>

      {!configured ? (
        <div className="flex gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            Fonction non activée : une clé d&apos;images IA (<code className="rounded bg-muted px-1">IMAGE_API_KEY</code>)
            doit être configurée côté plateforme. Les <strong>visuels de marque</strong> ci-dessus fonctionnent sans clé.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFormat(f.key)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  format === f.key
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted/40"
                }`}
              >
                {f.label} <span className="ml-1 text-xs text-muted-foreground">{f.hint}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brief-ia">Style (optionnel)</Label>
            <Textarea
              id="brief-ia"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={2}
              placeholder="Ex. photo lumineuse, tons bleus, environnement professionnel…"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={generate} disabled={pending}>
              {pending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Sparkles className="mr-1.5 size-4" />}
              Générer une image IA
            </Button>
            {img && (
              <Button size="sm" variant="outline" onClick={downloadImg} disabled={pending}>
                <Download className="mr-1.5 size-4" /> Télécharger
              </Button>
            )}
          </div>

          {img && (
            <div className="flex justify-center rounded-xl bg-muted/30 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="Illustration générée par IA" className="max-h-[420px] w-auto rounded-lg shadow-sm" />
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Chaque génération consomme du crédit sur le service d&apos;images configuré.
          </p>
        </>
      )}
    </Card>
  );
}
