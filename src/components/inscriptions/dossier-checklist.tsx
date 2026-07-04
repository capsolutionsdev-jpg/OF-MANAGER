"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { togglePieceRecue, relancerDossier } from "@/lib/actions/inscription-actions";
import { Badge } from "@/components/ui/badge";

type ValidInfo = { nom: string; date: string };

export function DossierChecklist({
  inscriptionId,
  piecesAttendues,
  piecesRecues,
  validePar,
}: {
  inscriptionId: string;
  piecesAttendues: string[];
  piecesRecues: string[];
  /** Traçabilité : pièce → { nom du collaborateur, date ISO }. */
  validePar?: Record<string, ValidInfo>;
}) {
  const router = useRouter();
  const [recues, setRecues] = useState<Set<string>>(new Set(piecesRecues));
  const [isPending, startTransition] = useTransition();
  const [relancing, startRelance] = useTransition();

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
    } catch {
      return "";
    }
  };

  function relancer() {
    startRelance(async () => {
      const res = await relancerDossier(inscriptionId);
      if (!res.ok) toast.error(res.error ?? "Relance impossible.");
      else if (res.manquantes === 0) toast.info("Dossier déjà complet — rien à relancer.");
      else if (res.sent) toast.success(`Relance envoyée (${res.manquantes} pièce(s) manquante(s)).`);
      else toast.info("Relance préparée (envoi e-mail non configuré).");
    });
  }

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
      } else {
        // rafraîchit pour afficher/mettre à jour « validé par … »
        router.refresh();
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
        {complete ? (
          <span className="text-xs font-medium text-emerald-700">
            Dossier complet ✓
          </span>
        ) : (
          <button
            type="button"
            onClick={relancer}
            disabled={relancing}
            className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-60"
            title="Envoyer un e-mail au candidat avec les pièces manquantes"
          >
            {relancing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Relancer
          </button>
        )}
      </div>
      <ul className="space-y-1">
        {piecesAttendues.map((piece) => {
          const ok = recues.has(piece);
          const info = ok ? validePar?.[piece] : undefined;
          return (
            <li key={piece}>
              <button
                type="button"
                onClick={() => toggle(piece)}
                disabled={isPending}
                className="flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left text-sm transition hover:bg-muted disabled:opacity-60"
              >
                {ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="flex-1">
                  <span className={ok ? "text-foreground" : "text-muted-foreground"}>{piece}</span>
                  {info && (
                    <span className="mt-0.5 block text-[11px] text-emerald-700">
                      ✓ validé par {info.nom}{info.date ? ` · ${fmtDate(info.date)}` : ""}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
