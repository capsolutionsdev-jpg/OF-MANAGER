"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Camera, Check, Loader2, Trash2, X, ArrowUp, ArrowDown, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Page = {
  id: string;
  thumb: string; // object URL (aperçu)
  bytes: Uint8Array; // JPEG
  ok: boolean;
  reason: string | null;
};

/** Qualité rapide d'un cliché : résolution + luminosité + netteté (Laplacien). */
function assess(canvas: HTMLCanvasElement): { ok: boolean; reason: string | null } {
  if (canvas.width < 800 || canvas.height < 600)
    return { ok: false, reason: "Résolution faible — rapprochez-vous." };
  const w = 320;
  const h = Math.max(1, Math.round((canvas.height * w) / canvas.width));
  const tmp = document.createElement("canvas");
  tmp.width = w; tmp.height = h;
  const ctx = tmp.getContext("2d");
  if (!ctx) return { ok: true, reason: null };
  ctx.drawImage(canvas, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Float64Array(w * h);
  let sum = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = g; sum += g;
  }
  const brightness = sum / (w * h);
  let ls = 0, lss = 0, n = 0;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      ls += lap; lss += lap * lap; n++;
    }
  const variance = n ? lss / n - (ls / n) * (ls / n) : 0;
  if (brightness < 45) return { ok: false, reason: "Trop sombre — éclairez le document." };
  if (brightness > 242) return { ok: false, reason: "Reflets / surexposition." };
  if (variance < 70) return { ok: false, reason: "Photo floue — stabilisez l'appareil." };
  return { ok: true, reason: null };
}

/** Uint8Array → data URL (via Blob + FileReader, sans base64 manuel). */
function bytesToDataUrl(bytes: Uint8Array, mime: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([bytes.slice()], { type: mime });
    const r = new FileReader();
    r.onerror = () => reject(new Error("lecture"));
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });
}

/**
 * Scanner multi-pages plein écran (tablette / mobile) : on capture une ou
 * plusieurs pages à la caméra, on les réordonne/supprime, puis on génère un
 * PDF unique renvoyé via `onComplete` (data URL). Idéal « inscription à l'accueil ».
 */
export function MultiPageScanner({
  onComplete,
  onCancel,
}: {
  onComplete: (pdfDataUrl: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [view, setView] = useState<"camera" | "review">("camera");
  const [building, setBuilding] = useState(false);

  // Démarrage caméra
  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      .then((s) => {
        if (active) setStream(s);
        else s.getTracks().forEach((t) => t.stop());
      })
      .catch(() => {
        toast.error("Caméra indisponible. Autorisez l'accès à la caméra.");
        onCancel();
      });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rattache le flux quand on est en vue caméra
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !stream || view !== "camera") return;
    v.srcObject = stream;
    const onReady = () => { v.play().catch(() => {}); setReady(true); };
    v.addEventListener("loadedmetadata", onReady);
    if (v.readyState >= 1) onReady();
    return () => v.removeEventListener("loadedmetadata", onReady);
  }, [stream, view]);

  // Nettoyage : stoppe la caméra + révoque les aperçus
  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);
  useEffect(() => () => { pages.forEach((p) => URL.revokeObjectURL(p.thumb)); }, [pages]);

  function shoot() {
    const v = videoRef.current;
    if (!v || v.videoWidth === 0) { toast.error("La caméra démarre… réessayez."); return; }
    const maxW = 1654; // ~ A4 à 140 dpi
    const scale = Math.min(1, maxW / v.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(v, 0, 0, canvas.width, canvas.height);
    const quality = assess(canvas);
    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        setPages((p) => [
          ...p,
          { id: `${Date.now()}-${p.length}`, thumb: URL.createObjectURL(blob), bytes, ok: quality.ok, reason: quality.reason },
        ]);
        if (!quality.ok) toast.warning(quality.reason ?? "Page peu lisible.");
      },
      "image/jpeg",
      0.82,
    );
  }

  function removePage(id: string) {
    setPages((p) => {
      const target = p.find((x) => x.id === id);
      if (target) URL.revokeObjectURL(target.thumb);
      return p.filter((x) => x.id !== id);
    });
  }

  function move(id: string, dir: -1 | 1) {
    setPages((p) => {
      const i = p.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= p.length) return p;
      const next = [...p];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function buildPdf() {
    if (pages.length === 0) return;
    setBuilding(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.create();
      for (const pg of pages) {
        const jpg = await pdf.embedJpg(pg.bytes);
        const page = pdf.addPage([jpg.width, jpg.height]);
        page.drawImage(jpg, { x: 0, y: 0, width: jpg.width, height: jpg.height });
      }
      const bytes = await pdf.save();
      const dataUrl = await bytesToDataUrl(bytes, "application/pdf");
      await onComplete(dataUrl);
    } catch {
      toast.error("Échec de la génération du PDF.");
    } finally {
      setBuilding(false);
    }
  }

  // ── Vue « relecture / réorganisation des pages » ──
  if (view === "review") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-neutral-900 text-white">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <button type="button" onClick={onCancel} aria-label="Annuler" className="rounded-full p-2 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium">{pages.length} page{pages.length > 1 ? "s" : ""}</span>
          <span className="w-9" />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {pages.length === 0 ? (
            <p className="mt-10 text-center text-sm text-white/60">Aucune page. Ajoutez-en avec la caméra.</p>
          ) : (
            <ul className="mx-auto grid max-w-md gap-3">
              {pages.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 rounded-lg bg-white/5 p-2">
                  <span className="w-5 shrink-0 text-center text-xs text-white/60">{i + 1}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumb} alt={`Page ${i + 1}`} className="h-24 w-16 rounded object-cover" />
                  <div className="flex-1 text-xs">
                    {p.ok ? (
                      <span className="text-emerald-400">Lisible</span>
                    ) : (
                      <span className="text-amber-400">{p.reason ?? "À vérifier"}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => move(p.id, -1)} disabled={i === 0} aria-label="Monter" className="rounded p-1.5 hover:bg-white/10 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" onClick={() => move(p.id, 1)} disabled={i === pages.length - 1} aria-label="Descendre" className="rounded p-1.5 hover:bg-white/10 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" onClick={() => removePage(p.id)} aria-label="Supprimer" className="rounded p-1.5 text-red-300 hover:bg-white/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 border-t border-white/10 bg-black/40 px-4 py-4">
          <Button type="button" variant="outline" onClick={() => { setReady(false); setView("camera"); }} className="bg-white/10 text-white hover:bg-white/20">
            <Camera className="mr-2 h-4 w-4" /> Ajouter des pages
          </Button>
          <Button type="button" onClick={buildPdf} disabled={pages.length === 0 || building}>
            {building ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            Générer le PDF
          </Button>
        </div>
      </div>
    );
  }

  // ── Vue caméra (capture) ──
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <button type="button" onClick={onCancel} aria-label="Fermer" className="absolute right-4 top-4 z-10 rounded-full bg-white/15 p-3 text-white backdrop-blur hover:bg-white/30">
        <X className="h-6 w-6" />
      </button>
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline autoPlay muted className="absolute inset-0 h-full w-full object-contain" />
        {!ready && <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Démarrage de la caméra…</div>}
        <p className="absolute inset-x-0 top-6 text-center text-sm font-medium text-white drop-shadow">
          Cadrez le document à plat, bien éclairé. Capturez chaque page.
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 bg-black/90 px-6 py-5">
        {/* Miniature dernière page + compteur */}
        <button
          type="button"
          onClick={() => setView("review")}
          disabled={pages.length === 0}
          className="relative h-16 w-12 shrink-0 overflow-hidden rounded border border-white/30 disabled:opacity-30"
          aria-label="Voir les pages"
        >
          {pages.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pages[pages.length - 1].thumb} alt="Dernière page" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-[10px] text-white/50">0</span>
          )}
          {pages.length > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{pages.length}</span>
          )}
        </button>

        <button type="button" onClick={shoot} aria-label="Capturer la page" className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 active:scale-90">
          <span className="h-14 w-14 rounded-full bg-white" />
        </button>

        <Button
          type="button"
          onClick={() => setView("review")}
          disabled={pages.length === 0}
          className="shrink-0"
        >
          <Check className="mr-1.5 h-4 w-4" /> Terminer
        </Button>
      </div>
    </div>
  );
}
