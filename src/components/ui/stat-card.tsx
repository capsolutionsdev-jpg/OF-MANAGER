import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { cn } from "@/lib/utils";

type Tint = "blue" | "emerald" | "amber" | "violet" | "rose";

const TINTS: Record<Tint, string> = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
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
        <div className="mt-3 text-3xl font-bold leading-none tracking-tight">
          {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
        </div>
        {trend && (
          <div
            className={cn(
              "mt-2 text-xs font-medium",
              trendUp === true && "text-emerald-600",
              trendUp === false && "text-rose-600",
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
