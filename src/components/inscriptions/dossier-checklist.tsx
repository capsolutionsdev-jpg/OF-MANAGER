"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { togglePieceRecue } from "@/lib/actions/inscription-actions";
import { Badge } from "@/components/ui/badge";

export function DossierChecklist({
  inscriptionId,
  piecesAttendues,
  piecesRecues,
}: {
  inscriptionId: string;
  piecesAttendues: string[];
  piecesRecues: string[];
}) {
  const [recues, setRecues] = useState<Set<string>>(new Set(piecesRecues));
  const [isPending, startTransition] = useTransition();

  if (piecesAttendues.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Aucune pièce administrative définie pour cette formation.
      </p>
    );
  }

  const done = piecesAttendues.filter((p) => recues.has(p)).length;
  const complete = done === piecesAttendues.length;

  function toggle(piece: string) {
    const next = new Set(recues);
    const willReceive = !next.has(piece);
    if (willReceive) next.add(piece);
    else next.delete(piece);
    setRecues(next); // mise à jour optimiste
    startTransition(async () => {
      const res = await togglePieceRecue(inscriptionId, piece, willReceive);
      if (!res.ok) {
        // rollback en cas d'échec
        const revert = new Set(next);
        if (willReceive) revert.delete(piece);
        else revert.add(piece);
        setRecues(revert);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge
          className={
            complete
              ? "bg-emerald-500/10 text-emerald-700"
              : "bg-amber-500/10 text-amber-700"
          }
        >
          {done}/{piecesAttendues.length} pièce{piecesAttendues.length > 1 ? "s" : ""}
        </Badge>
        {complete && (
          <span className="text-xs font-medium text-emerald-700">
            Dossier complet ✓
          </span>
        )}
      </div>
      <ul className="space-y-1">
        {piecesAttendues.map((piece) => {
          const ok = recues.has(piece);
          return (
            <li key={piece}>
              <button
                type="button"
                onClick={() => toggle(piece)}
                disabled={isPending}
                className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm transition hover:bg-muted disabled:opacity-60"
              >
                {ok ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className={ok ? "text-foreground" : "text-muted-foreground"}>
                  {piece}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
