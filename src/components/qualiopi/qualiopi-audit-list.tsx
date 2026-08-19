"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, CheckCircle2, AlertTriangle, XCircle, MinusCircle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TONE_CLASSES } from "@/components/ui/status-badge";

type Statut = "OK" | "PARTIEL" | "MANQUANT" | "NA";
type Check = { key: string; label: string; indicateur: number | null; statut: Statut; detail: string };
export type AuditRow = {
  id: string;
  titre: string;
  reference: string | null;
  periode: string;
  statut: string;
  score: number;
  nbAComplete: number;
  checks: Check[];
};

const ICON: Record<Statut, typeof CheckCircle2> = {
  OK: CheckCircle2, PARTIEL: AlertTriangle, MANQUANT: XCircle, NA: MinusCircle,
};
const COLOR: Record<Statut, string> = {
  OK: "text-success", PARTIEL: "text-warning", MANQUANT: "text-destructive", NA: "text-muted-foreground/50",
};

function scoreBadge(score: number) {
  const cls =
    score >= 100 ? TONE_CLASSES.success :
    score >= 70 ? TONE_CLASSES.warning :
    TONE_CLASSES.danger;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{score}%</span>;
}

export function QualiopiAuditList({ rows }: { rows: AuditRow[] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        Aucun dossier de formation à auditer (sessions non archivées).
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const isOpen = open === r.id;
        return (
          <div key={r.id} className="overflow-hidden rounded-lg border">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : r.id)}
              className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/40"
            >
              <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{r.titre}</div>
                <div className="text-xs text-muted-foreground">
                  {r.reference ? r.reference + " · " : ""}{r.periode}
                </div>
              </div>
              {r.nbAComplete > 0 ? (
                <Badge variant="outline" className="border-warning/40 text-warning">
                  {r.nbAComplete} à compléter
                </Badge>
              ) : (
                <Badge variant="outline" className="border-success/40 text-success">Conforme</Badge>
              )}
              {scoreBadge(r.score)}
            </button>

            {isOpen && (
              <div className="border-t bg-muted/20 p-3">
                <ul className="space-y-1.5">
                  {r.checks.map((c) => {
                    const Icon = ICON[c.statut];
                    return (
                      <li key={c.key} className="flex items-start gap-2 text-sm">
                        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${COLOR[c.statut]}`} />
                        <span className={c.statut === "NA" ? "text-muted-foreground/60" : ""}>
                          {c.label}
                          {c.indicateur ? <span className="text-xs text-muted-foreground"> · ind. {c.indicateur}</span> : null}
                          {c.detail ? <span className="text-xs text-muted-foreground"> — {c.detail}</span> : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <Link
                  href={`/sessions/${r.id}`}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Ouvrir le dossier pour compléter <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
