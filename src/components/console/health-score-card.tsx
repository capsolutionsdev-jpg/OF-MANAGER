import { HeartPulse, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientHealth, HealthStatus } from "@/lib/console-health-score";

// Présentation pure du score de santé/churn (rendu côté serveur, sans état).
const LEVEL = {
  bon: { label: "Bon", cls: "text-emerald-600 dark:text-emerald-400", ring: "#10B981" },
  surveiller: { label: "À surveiller", cls: "text-amber-600 dark:text-amber-400", ring: "#F59E0B" },
  risque: { label: "À risque", cls: "text-rose-600 dark:text-rose-400", ring: "#E11D48" },
} as const;

const DOT: Record<HealthStatus, string> = {
  ok: "text-emerald-500",
  warn: "text-amber-500",
  bad: "text-rose-500",
};
const ICON: Record<HealthStatus, typeof CheckCircle2> = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  bad: XCircle,
};

export function HealthScoreCard({ health }: { health: ClientHealth }) {
  const lv = LEVEL[health.level];
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
          <HeartPulse className="h-4 w-4" /> Santé du client
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-5">
          {/* Jauge circulaire */}
          <div
            className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full"
            style={{ background: `conic-gradient(${lv.ring} ${health.score * 3.6}deg, rgba(148,163,184,0.25) 0)` }}
          >
            <div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-card">
              <span className="text-2xl font-bold tabular-nums">{health.score}</span>
            </div>
          </div>
          <div className="min-w-[8rem]">
            <p className={`text-lg font-semibold ${lv.cls}`}>{lv.label}</p>
            <p className="text-xs text-muted-foreground">Score de rétention (0–100)</p>
          </div>
          {/* Détail des signaux */}
          <ul className="grid flex-1 gap-1.5 sm:grid-cols-2">
            {health.signals.map((s) => {
              const Icon = ICON[s.status];
              return (
                <li key={s.key} className="flex items-center gap-1.5 text-xs">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${DOT[s.status]}`} />
                  <span className="text-muted-foreground">{s.label} :</span>
                  <span className="font-medium">{s.detail}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
