import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Une jauge du « bandeau-instruments » (direction Poste de pilotage) : label mono,
 * grand chiffre mono tabulaire, barre de progression optionnelle, note ou état « Validé ».
 * Se place en cellule d'une grille divisée en tête de fiche (session, candidat…).
 */
export function InstrumentGauge({
  label,
  value,
  sub,
  bar,
  tone = "primary",
  ok,
}: {
  label: string;
  value: string;
  sub?: string;
  /** 0–100 : affiche une barre de progression. */
  bar?: number;
  tone?: "primary" | "success" | "warning";
  /** Remplace la note par un pictogramme « Validé ». */
  ok?: boolean;
}) {
  const barColor =
    tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-primary";
  return (
    <div className="p-4">
      <div className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5 font-mono text-2xl font-semibold tracking-tight tabular-nums",
          tone === "warning" ? "text-warning" : "text-foreground",
        )}
      >
        {value}
      </div>
      {typeof bar === "number" && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", barColor)}
            style={{ width: `${Math.min(100, Math.max(0, bar))}%` }}
          />
        </div>
      )}
      {ok ? (
        <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-success">
          <CheckCircle2 className="h-3 w-3" /> Validé
        </div>
      ) : (
        sub && <div className="mt-2 text-[11px] text-muted-foreground">{sub}</div>
      )}
    </div>
  );
}
