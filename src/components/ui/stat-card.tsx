import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { cn } from "@/lib/utils";

type Tint = "blue" | "emerald" | "amber" | "violet" | "rose";

// Tints dérivés des tokens sémantiques (couleur tenant + dark-mode automatiques),
// au lieu de la palette Tailwind brute (-50 / -600) qui ignorait le thème.
const TINTS: Record<Tint, string> = {
  blue: "bg-info/10 text-info",
  emerald: "bg-success/10 text-success",
  amber: "bg-warning/10 text-warning",
  violet: "bg-primary/10 text-primary",
  rose: "bg-destructive/10 text-destructive",
};

/** Carte d'indicateur clé (design system) : libellé, grand chiffre animé,
 * micro-tendance. Se soulève légèrement au survol ; l'icône réagit. */
export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  tint = "blue",
  className,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  tint?: Tint;
  className?: string;
}) {
  return (
    <Card className={cn("hover-lift group/stat", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover/stat:scale-110 group-hover/stat:-rotate-3",
              TINTS[tint],
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
        </div>
        <div className="mt-3 font-mono text-3xl font-bold leading-none tracking-tight tabular-nums">
          {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
        </div>
        {trend && (
          <div
            className={cn(
              "mt-2 text-xs font-medium",
              trendUp === true && "text-success",
              trendUp === false && "text-destructive",
              trendUp === undefined && "text-muted-foreground",
            )}
          >
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
