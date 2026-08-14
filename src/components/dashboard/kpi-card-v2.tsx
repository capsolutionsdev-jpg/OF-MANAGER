import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Tint = "violet" | "emerald" | "amber" | "blue" | "rose";

const TINT_STYLES: Record<Tint, { bg: string; text: string; stroke: string; fill: string }> = {
  violet: {
    bg: "bg-violet-100 dark:bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    stroke: "stroke-violet-500",
    fill: "fill-violet-500/10",
  },
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    stroke: "stroke-emerald-500",
    fill: "fill-emerald-500/10",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    stroke: "stroke-amber-500",
    fill: "fill-amber-500/10",
  },
  blue: {
    bg: "bg-blue-100 dark:bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    stroke: "stroke-blue-500",
    fill: "fill-blue-500/10",
  },
  rose: {
    bg: "bg-rose-100 dark:bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    stroke: "stroke-rose-500",
    fill: "fill-rose-500/10",
  },
};

/**
 * Génère un mini-sparkline SVG à partir d'une valeur "cible".
 * Sans historique réel, on produit une courbe légèrement ondulée qui
 * finit sur un pic haut (impression de croissance). Pure décoration
 * visuelle — un `series?: number[]` peut être branché plus tard.
 */
function Sparkline({ tint, seed }: { tint: Tint; seed: number }) {
  const s = TINT_STYLES[tint];
  const width = 200;
  const height = 40;
  const pts = 24;
  // Pseudo-aléatoire déterministe basé sur seed pour éviter du contenu
  // qui change à chaque render (et l'hydratation SSR/CSR mismatch).
  const values: number[] = [];
  let x = (seed * 9301 + 49297) % 233280;
  for (let i = 0; i < pts; i++) {
    x = (x * 9301 + 49297) % 233280;
    const noise = (x / 233280) * 0.4;
    const trend = i / pts; // Tendance douce vers le haut
    values.push(0.35 + noise + trend * 0.4);
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / (pts - 1);
  const coords = values.map((v, i) => {
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return `${i * step},${y}`;
  });
  const linePath = "M" + coords.join(" L");
  const areaPath = linePath + ` L${width},${height} L0,${height} Z`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-10 w-full"
      aria-hidden="true"
    >
      <path d={areaPath} className={s.fill} />
      <path d={linePath} className={cn(s.stroke, "fill-none")} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export interface KpiCardV2Props {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tint: Tint;
  /** ex. "+12% ce mois-ci" — omis = pas d'affichage */
  trend?: string;
  /** true = flèche vers le bas + couleur rose, sinon vert */
  trendDown?: boolean;
  /** graine pour le sparkline (permet une courbe stable par card) */
  seed?: number;
}

export function KpiCardV2({
  label,
  value,
  icon: Icon,
  tint,
  trend,
  trendDown = false,
  seed = 1,
}: KpiCardV2Props) {
  const s = TINT_STYLES[tint];
  const TrendIcon = trendDown ? TrendingDown : TrendingUp;
  const trendColor = trendDown
    ? "text-rose-600 dark:text-rose-400"
    : "text-emerald-600 dark:text-emerald-400";

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", s.bg)}>
          <Icon className={cn("h-5 w-5", s.text)} />
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-3xl font-bold tracking-tight text-foreground">{value}</p>
        </div>
      </div>

      {trend && (
        <div className={cn("mt-3 flex items-center gap-1 text-xs font-medium", trendColor)}>
          <TrendIcon className="h-3.5 w-3.5" />
          <span>{trend}</span>
        </div>
      )}

      <div className="mt-3 -mx-1">
        <Sparkline tint={tint} seed={seed} />
      </div>
    </div>
  );
}
