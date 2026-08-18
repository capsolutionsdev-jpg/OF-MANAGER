"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, ImageIcon, Images } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type CardData = {
  organismeNom: string;
  couleurPrimaire: string;
  couleurSecondaire: string | null;
  formationTitre: string;
  dateDebut: string;
  dateFin: string;
  memeJour: boolean;
  distanciel: boolean;
  lieu: string | null;
  dureeHeures: number | null;
  prix: string | null;
  certification: string | null;
  qualiopi: boolean;
  siteWeb: string | null;
};

type Format = { key: string; label: string; hint: string; w: number; h: number };

const FORMATS: Format[] = [
  { key: "carre", label: "Carré", hint: "Instagram / Facebook", w: 1080, h: 1080 },
  { key: "paysage", label: "Paysage", hint: "LinkedIn / lien", w: 1200, h: 627 },
  { key: "story", label: "Story / Reel", hint: "Insta / TikTok", w: 1080, h: 1920 },
];

// ─── Helpers couleur ─────────────────────────────────────────────────────────
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = (hex || "").trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) return { r: 26, g: 95, b: 212 }; // #1A5FD4
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function mix(hex: string, target: string, t: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
const darken = (hex: string, t: number) => mix(hex, "#000000", t);
function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const contrastText = (hex: string) => (luminance(hex) > 0.55 ? "#0D1B3E" : "#FFFFFF");

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "session";
}

// ─── Rendu d'une carte ───────────────────────────────────────────────────────
// Mise en page en FLUX MESURÉ : on empile des blocs (en-tête, titre, faits,
// prix), on n'ajoute les blocs optionnels que s'ils rentrent au-dessus du pied
// (jamais de chevauchement), puis on centre verticalement l'ensemble.
function renderCard(canvas: HTMLCanvasElement, fmt: Format, d: CardData) {
  const { w: W, h: H } = fmt;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const primary = d.couleurPrimaire || "#1A5FD4";
  const ink = contrastText(darken(primary, 0.2));
  const soft = ink === "#FFFFFF" ? "rgba(255,255,255," : "rgba(13,27,62,";
  const unit = Math.min(W, H);
  const PX = Math.round(W * 0.075);
  const PY = Math.round(H * 0.07);
  const FONT = "'Poppins','Inter',system-ui,'Segoe UI',sans-serif";

  // Fond : dégradé de la couleur de marque + halo décoratif.
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, darken(primary, 0.05));
  g.addColorStop(1, darken(primary, 0.5));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const halo = ctx.createRadialGradient(W * 0.85, H * 0.12, 0, W * 0.85, H * 0.12, W * 0.6);
  halo.addColorStop(0, `${soft}0.12)`);
  halo.addColorStop(1, `${soft}0)`);
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";

  const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  };

  const pill = (
    x: number,
    y: number,
    text: string,
    o: { size: number; bg: string; color: string; border?: string },
  ) => {
    ctx.font = `600 ${o.size}px ${FONT}`;
    const padX = o.size * 0.7;
    const h = o.size * 1.9;
    const w = ctx.measureText(text).width + padX * 2;
    roundRect(x, y, w, h, h / 2);
    ctx.fillStyle = o.bg;
    ctx.fill();
    if (o.border) {
      ctx.lineWidth = Math.max(1, o.size * 0.06);
      ctx.strokeStyle = o.border;
      ctx.stroke();
    }
    ctx.fillStyle = o.color;
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + padX, y + h / 2 + o.size * 0.04);
    ctx.textBaseline = "alphabetic";
    return w;
  };

  const wrap = (text: string, maxW: number, font: string, maxLines: number): string[] => {
    ctx.font = font;
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const word of words) {
      const test = cur ? `${cur} ${word}` : word;
      if (ctx.measureText(test).width > maxW && cur) {
        lines.push(cur);
        cur = word;
        if (lines.length === maxLines - 1) break;
      } else {
        cur = test;
      }
    }
    if (cur && lines.length < maxLines) lines.push(cur);
    const used = lines.join(" ").split(/\s+/).length;
    if (used < words.length && lines.length) {
      let last = lines[lines.length - 1];
      while (ctx.measureText(`${last}…`).width > maxW && last.length) last = last.slice(0, -1);
      lines[lines.length - 1] = `${last}…`;
    }
    return lines;
  };

  const contentW = W - PX * 2;

  // Tailles.
  const nameSize = Math.round(unit * 0.03);
  const bsize = Math.round(unit * 0.022);
  const titleSize = Math.round(unit * 0.066);
  const lineH = Math.round(unit * 0.078);
  const labelSize = Math.round(unit * 0.019);
  const valueSize = Math.round(unit * 0.03);
  const priceSize = Math.round(unit * 0.03);
  const ctaSize = Math.round(unit * 0.028);
  const ctaH = ctaSize * 1.9;

  // Zone de contenu disponible (au-dessus du pied réservé).
  const availTop = PY;
  const availBottom = H - PY - ctaH - unit * 0.05;
  const avail = availBottom - availTop;

  // Construction de la pile de blocs (closures dessinant à un `top` donné).
  const ops: Array<(base: number) => void> = [];
  let stackH = 0;
  const add = (h: number, draw: (top: number) => void) => {
    const at = stackH;
    ops.push((base) => draw(base + at));
    stackH += h;
  };
  const fits = (h: number) => stackH + h <= avail;

  // En-tête : nom de l'OF + filet + badges.
  const name = d.organismeNom.toUpperCase();
  const badges: string[] = [];
  if (d.qualiopi) badges.push("QUALIOPI");
  if (d.certification) badges.push("CERTIFIANTE");
  if (d.qualiopi) badges.push("CPF / OPCO");
  const filetH = Math.max(2, Math.round(unit * 0.006));
  const headerH =
    nameSize + Math.round(unit * 0.028) + filetH + Math.round(unit * 0.03) + (badges.length ? bsize * 1.9 : 0);
  add(headerH, (top) => {
    let yy = top;
    ctx.fillStyle = ink;
    ctx.font = `700 ${nameSize}px ${FONT}`;
    let nx = PX;
    const ls = unit * 0.004;
    for (const ch of name) {
      ctx.fillText(ch, nx, yy + nameSize);
      nx += ctx.measureText(ch).width + ls;
      if (nx > W - PX) break;
    }
    yy += nameSize + Math.round(unit * 0.028);
    ctx.fillStyle = `${soft}0.25)`;
    ctx.fillRect(PX, yy, unit * 0.12, filetH);
    yy += filetH + Math.round(unit * 0.03);
    if (badges.length) {
      let bx = PX;
      for (const b of badges) {
        const bw = pill(bx, yy, b, { size: bsize, bg: `${soft}0.14)`, color: ink, border: `${soft}0.28)` });
        bx += bw + unit * 0.02;
        if (bx > W - PX) break;
      }
    }
  });

  // Titre (nombre de lignes plafonné selon le format).
  const titleMax = fmt.key === "paysage" ? 2 : fmt.key === "carre" ? 3 : 5;
  const titleFont = `800 ${titleSize}px ${FONT}`;
  const titleLines = wrap(d.formationTitre, contentW, titleFont, titleMax);
  add(titleLines.length * lineH + Math.round(unit * 0.02), (top) => {
    ctx.font = titleFont;
    ctx.fillStyle = ink;
    titleLines.forEach((line, i) => ctx.fillText(line, PX, top + titleSize + i * lineH));
  });

  // Faits (valeur sur 1 ligne, compacte).
  const factH = labelSize + Math.round(unit * 0.008) + valueSize + Math.round(unit * 0.02);
  const addFact = (label: string, value: string) => {
    add(factH, (top) => {
      ctx.font = `700 ${labelSize}px ${FONT}`;
      ctx.fillStyle = `${soft}0.6)`;
      ctx.fillText(label.toUpperCase(), PX, top + labelSize);
      ctx.font = `600 ${valueSize}px ${FONT}`;
      ctx.fillStyle = ink;
      const v = wrap(value, contentW, `600 ${valueSize}px ${FONT}`, 1)[0] ?? value;
      ctx.fillText(v, PX, top + labelSize + Math.round(unit * 0.008) + valueSize);
    });
  };

  // Faits essentiels.
  addFact("Dates", d.memeJour ? `Le ${d.dateDebut}` : `${d.dateDebut} → ${d.dateFin}`);
  if (d.distanciel) addFact("Modalité", "À distance (visio)");
  else if (d.lieu) addFact("Lieu", d.lieu);
  if (d.dureeHeures != null) addFact("Durée", `${d.dureeHeures} heures`);

  // Prix (prioritaire sur la certification s'il faut choisir).
  const priceH = priceSize * 1.9 + Math.round(unit * 0.014);
  if (d.prix && fits(priceH)) {
    add(priceH, (top) => {
      pill(PX, top + Math.round(unit * 0.006), `À partir de ${d.prix}`, {
        size: priceSize,
        bg: ink === "#FFFFFF" ? "#FFFFFF" : darken(primary, 0.1),
        color: ink === "#FFFFFF" ? darken(primary, 0.15) : "#FFFFFF",
      });
    });
  }

  // Certification en fait, seulement si elle rentre.
  if (d.certification && fits(factH)) addFact("Certification", d.certification);

  // Centrage vertical de la pile puis rendu.
  const startY = availTop + Math.max(0, (avail - stackH) / 2);
  ops.forEach((op) => op(startY));

  // Pied : CTA + site (position fixe, zone réservée).
  const footY = H - PY - ctaH;
  const accent = d.couleurSecondaire || "#FFFFFF";
  const ctaW = pill(PX, footY, "Inscriptions ouvertes", {
    size: ctaSize,
    bg: accent,
    color: contrastText(accent),
  });
  if (d.siteWeb) {
    ctx.font = `600 ${Math.round(unit * 0.024)}px ${FONT}`;
    ctx.fillStyle = ink;
    const url = d.siteWeb.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const uw = ctx.measureText(url).width;
    if (PX + ctaW + unit * 0.03 + uw < W - PX) {
      ctx.textBaseline = "middle";
      ctx.fillText(url, PX + ctaW + unit * 0.03, footY + ctaH / 2 + ctaSize * 0.04);
      ctx.textBaseline = "alphabetic";
    }
  }
}

function download(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve();
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });
}

export function VisualCards({ data }: { data: CardData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState<Format>(FORMATS[0]);
  const [busy, setBusy] = useState(false);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (c) renderCard(c, active, data);
  }, [active, data]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
      } catch {
        /* noop */
      }
      if (!cancelled) draw();
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [draw]);

  const base = slugify(data.formationTitre);

  async function downloadActive() {
    const c = canvasRef.current;
    if (!c) return;
    setBusy(true);
    await download(c, `${base}-${active.key}.png`);
    setBusy(false);
    toast.success(`Visuel ${active.label} téléchargé.`);
  }

  async function downloadAll() {
    setBusy(true);
    const off = document.createElement("canvas");
    for (const f of FORMATS) {
      renderCard(off, f, data);
      // Laisse le temps au navigateur d'enchaîner les téléchargements.
      await download(off, `${base}-${f.key}.png`);
      await new Promise((r) => setTimeout(r, 250));
    }
    // Restaure l'aperçu sur le format actif.
    draw();
    setBusy(false);
    toast.success("3 formats téléchargés.");
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <ImageIcon className="size-4 text-primary" /> Visuels de marque
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Affiches à votre charte, prêtes à publier. Choisissez un format, prévisualisez, téléchargez.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadAll} disabled={busy}>
          <Images className="mr-1.5 size-4" /> Télécharger les 3 formats
        </Button>
      </div>

      {/* Sélecteur de format */}
      <div className="flex flex-wrap gap-2">
        {FORMATS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setActive(f)}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
              active.key === f.key
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border text-muted-foreground hover:bg-muted/40"
            }`}
          >
            <span className="block font-medium">{f.label}</span>
            <span className="block text-xs text-muted-foreground">
              {f.hint} · {f.w}×{f.h}
            </span>
          </button>
        ))}
      </div>

      {/* Aperçu */}
      <div className="flex justify-center rounded-xl bg-muted/30 p-4">
        <canvas
          ref={canvasRef}
          className="h-auto w-full rounded-lg shadow-sm"
          style={{ maxWidth: active.key === "story" ? 300 : active.key === "paysage" ? 560 : 420 }}
        />
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={downloadActive} disabled={busy}>
          <Download className="mr-1.5 size-4" /> Télécharger « {active.label} »
        </Button>
      </div>
    </Card>
  );
}
