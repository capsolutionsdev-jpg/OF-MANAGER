"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, FileText, ImageIcon } from "lucide-react";
import { setPieceStatut } from "@/lib/actions/dossier-actions";

export type AdminPiece = {
  id: string; label: string; url: string; mimeType: string | null;
  statut: "EN_ATTENTE" | "VALIDEE" | "REFUSEE"; motifRefus: string | null;
};

const PILL: Record<string, string> = {
  EN_ATTENTE: "bg-amber-500/10 text-amber-700",
  VALIDEE: "bg-emerald-500/10 text-emerald-700",
  REFUSEE: "bg-red-500/10 text-red-700",
};
const LABEL: Record<string, string> = { EN_ATTENTE: "À vérifier", VALIDEE: "Validée", REFUSEE: "Refusée" };

export function PieceValidation({ pieces }: { pieces: AdminPiece[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [refusFor, setRefusFor] = useState<string | null>(null);
  const [motif, setMotif] = useState("");

  function valide(id: string) {
    startTransition(async () => {
      const res = await setPieceStatut(id, "VALIDEE");
      if (res.ok) { toast.success("Pièce validée."); router.refresh(); }
      else toast.error(res.error ?? "Erreur.");
    });
  }
  function refuse(id: string) {
    startTransition(async () => {
      const res = await setPieceStatut(id, "REFUSEE", motif);
      if (res.ok) { toast.success("Pièce refusée."); setRefusFor(null); setMotif(""); router.refresh(); }
      else toast.error(res.error ?? "Erreur.");
    });
  }

  if (pieces.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Pièces déposées par le candidat
      </p>
      <ul className="space-y-1.5">
        {pieces.map((p) => (
          <li key={p.id} className="rounded-md border p-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {p.mimeType?.startsWith("image/") ? <ImageIcon className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-primary hover:underline">{p.label}</a>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${PILL[p.statut]}`}>{LABEL[p.statut]}</span>
              <button type="button" disabled={pending} onClick={() => valide(p.id)}
                className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs text-emerald-700 hover:bg-emerald-50">
                <Check className="h-3.5 w-3.5" /> Valider
              </button>
              <button type="button" disabled={pending} onClick={() => { setRefusFor(refusFor === p.id ? null : p.id); setMotif(p.motifRefus ?? ""); }}
                className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs text-red-700 hover:bg-red-50">
                <X className="h-3.5 w-3.5" /> Refuser
              </button>
            </div>
            {p.statut === "REFUSEE" && p.motifRefus && refusFor !== p.id && (
              <p className="mt-1 text-[11px] text-red-600">Motif : {p.motifRefus}</p>
            )}
            {refusFor === p.id && (
              <div className="mt-2 flex flex-wrap gap-2">
                <input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif du refus (visible par le candidat)"
                  className="h-8 flex-1 rounded-md border bg-transparent px-2 text-xs" />
                <button type="button" disabled={pending} onClick={() => refuse(p.id)}
                  className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white">Confirmer le refus</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
