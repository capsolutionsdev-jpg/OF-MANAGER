"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KPICardProps {
  title: string;
  value: string | number;
  trend?: number; // % change
  unit?: string;
  icon?: React.ReactNode;
  color?: "primary" | "success" | "warning" | "destructive";
}

export function KPICard({
  title,
  value,
  trend,
  unit,
  icon,
  color = "primary",
}: KPICardProps) {
  const isPositive = trend && trend > 0;
  const colorClass = {
    primary: "text-primary",
    success: "text-green-600",
    warning: "text-orange-600",
    destructive: "text-red-600",
  }[color];

  return (
    <div className="bg-card border rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {icon && <div className={cn("text-2xl", colorClass)}>{icon}</div>}
      </div>

      {/* Value */}
      <div>
        <div className="text-3xl font-bold text-foreground">
          {value}
          {unit && <span className="text-lg text-muted-foreground">{unit}</span>}
        </div>
      </div>

      {/* Trend */}
      {trend !== undefined && (
        <div
          className={cn(
            "flex items-center gap-1 text-sm font-medium",
            isPositive ? "text-green-600" : "text-red-600"
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span>{Math.abs(trend)}% MoM</span>
        </div>
      )}
    </div>
  );
}
