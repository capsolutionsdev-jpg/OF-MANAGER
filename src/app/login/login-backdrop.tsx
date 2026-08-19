"use client";

import { useEffect, useRef } from "react";

/** Convertit une couleur CSS (#hex ou rgb(...)) en triplet RGB. */
function toRgb(value: string, fallback: [number, number, number]): [number, number, number] {
  const v = value.trim();
  if (v.startsWith("#")) {
    let h = v.slice(1);
    if (h.length === 3) h = h.split("").map((x) => x + x).join("");
    if (h.length === 6) {
      const n = parseInt(h, 16);
      if (!Number.isNaN(n)) return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
  }
  const m = v.match(/(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return fallback;
}

/**
 * Fond génératif animé de la page de connexion : halos lumineux qui dérivent +
 * constellation de points reliés. L'accent bleu reprend `--primary` du tenant.
 * Respecte `prefers-reduced-motion` (rend une image figée).
 */
export function LoginBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d");
    if (!g) return;

    const cs = getComputedStyle(c);
    const AZUR = toRgb(cs.getPropertyValue("--primary"), [61, 107, 255]);
    const AMBER = toRgb(cs.getPropertyValue("--amber"), [232, 147, 12]);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0, H = 0, DPR = 1, raf = 0;
    const resize = () => {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = c.width = window.innerWidth * DPR;
      H = c.height = window.innerHeight * DPR;
      c.style.width = `${window.innerWidth}px`;
      c.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    const orbs = [
      { x: 0.22, y: 0.28, r: 0.52, col: AZUR, a: 0.55, sp: 0.9, px: 0, py: 0 },
      { x: 0.82, y: 0.14, r: 0.42, col: AZUR, a: 0.4, sp: 1.3, px: 0, py: 0 },
      { x: 0.74, y: 0.84, r: 0.5, col: AMBER, a: 0.34, sp: 1.0, px: 0, py: 0 },
      { x: 0.12, y: 0.9, r: 0.44, col: AZUR, a: 0.3, sp: 1.5, px: 0, py: 0 },
    ];
    orbs.forEach((o) => { o.px = Math.random() * 6.28; o.py = Math.random() * 6.28; });

    const N = 72;
    const pts = Array.from({ length: N }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 7e-5,
      vy: (Math.random() - 0.5) * 7e-5,
    }));

    const rgba = (col: number[], a: number) => `rgba(${col[0]},${col[1]},${col[2]},${a})`;
    let t = 0;

    const frame = () => {
      t++;
      g.globalCompositeOperation = "source-over";
      g.fillStyle = "#080d1a";
      g.fillRect(0, 0, W, H);

      g.globalCompositeOperation = "lighter";
      for (const o of orbs) {
        const ox = (o.x + Math.sin(t * 0.0016 * o.sp + o.px) * 0.045) * W;
        const oy = (o.y + Math.cos(t * 0.0016 * o.sp + o.py) * 0.045) * H;
        const rr = o.r * Math.min(W, H) * (1 + Math.sin(t * 0.0022 * o.sp) * 0.08);
        const grd = g.createRadialGradient(ox, oy, 0, ox, oy, rr);
        grd.addColorStop(0, rgba(o.col, o.a));
        grd.addColorStop(1, rgba(o.col, 0));
        g.fillStyle = grd;
        g.beginPath();
        g.arc(ox, oy, rr, 0, Math.PI * 2);
        g.fill();
      }

      g.globalCompositeOperation = "source-over";
      if (!reduce) {
        for (const p of pts) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x += 1; else if (p.x > 1) p.x -= 1;
          if (p.y < 0) p.y += 1; else if (p.y > 1) p.y -= 1;
        }
      }
      const D = 0.13;
      g.lineWidth = DPR;
      for (let i = 0; i < N; i++) {
        const a = pts[i];
        for (let j = i + 1; j < N; j++) {
          const b = pts[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < D) {
            g.strokeStyle = `rgba(125,155,255,${(1 - d / D) * 0.15})`;
            g.beginPath();
            g.moveTo(a.x * W, a.y * H);
            g.lineTo(b.x * W, b.y * H);
            g.stroke();
          }
        }
      }
      g.fillStyle = "rgba(165,190,255,.55)";
      for (const p of pts) {
        g.beginPath();
        g.arc(p.x * W, p.y * H, 1.4 * DPR, 0, Math.PI * 2);
        g.fill();
      }

      if (!reduce) raf = requestAnimationFrame(frame);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-0" />;
}
