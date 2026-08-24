"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle2, XCircle, Clock, FileDown, RefreshCw } from "lucide-react";
import { uploadPieceClient, uploadPieceCandidatCompte } from "@/lib/actions/dossier-b2b-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PieceEtat, DossierProgress } from "@/lib/dossier/etat";

type Mode = "client" | "candidat";

const STATUT_UI: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  A_FOURNIR: { label: "À fournir", cls: "text-muted-foreground", icon: Clock },
  EN_ATTENTE: { label: "Déposée — en attente de validation", cls: "text-amber-600 dark:text-amber-400", icon: Clock },
  VALIDEE: { label: "Validée", cls: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
  REFUSEE: { label: "Refusée — à redéposer", cls: "text-red-600 dark:text-red-400", icon: XCircle },
};

export function DossierPanel({
  inscriptionId, candidat, formation, etats, progress, mode,
}: {
  inscriptionId: string;
  candidat: string;
  formation: string;
  etats: PieceEtat[];
  progress: DossierProgress;
  mode: Mode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const downloadHref = mode === "client" ? "/espace-entreprise/download" : "/mon-dossier/download";

  const upload = (piece: string, file: File) => {
    if (file.size > 8.2 * 1024 * 1024) { toast.error("Fichier trop volumineux (max 8 Mo)."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      setBusy(piece);
      start(async () => {
        const act = mode === "client" ? uploadPieceClient : uploadPieceCandidatCompte;
        const r = await act(inscriptionId, piece, dataUrl);
        setBusy(null);
        if (!r.ok) { toast.error(r.error ?? "Le dépôt a échoué."); return; }
        toast.success("Pièce déposée.");
        router.refresh();
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-xl border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{candidat}</p>
          <p className="truncate text-xs text-muted-foreground">{formation}</p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", progress.complet ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>
          {progress.complet ? "Dossier complet" : `${progress.validees}/${progress.obligatoires} validées`}
          {!progress.complet && progress.manquantesObligatoires > 0 ? ` · ${progress.manquantesObligatoires} manquante(s)` : ""}
        </span>
      </div>
      <ul className="divide-y">
        {etats.map((e) => {
          const ui = STATUT_UI[e.statut];
          const Icon = ui.icon;
          const loading = pending && busy === e.libelle;
          return (
            <li key={e.libelle} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm">{e.libelle}{!e.obligatoire && <span className="ml-1.5 text-xs text-muted-foreground">(facultative)</span>}</p>
                <p className={cn("mt-0.5 flex items-center gap-1 text-xs", ui.cls)}>
                  <Icon className="h-3.5 w-3.5" /> {ui.label}
                  {e.statut === "REFUSEE" && e.motifRefus ? ` — ${e.motifRefus}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {e.url && e.pieceId && (
                  <a href={`${downloadHref}?kind=dossier&id=${e.pieceId}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <FileDown className="h-3.5 w-3.5" /> Voir
                  </a>
                )}
                <input
                  ref={(el) => { inputs.current[e.libelle] = el; }}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(ev) => { const f = ev.target.files?.[0]; if (f) upload(e.libelle, f); ev.target.value = ""; }}
                />
                <Button size="sm" variant={e.statut === "A_FOURNIR" ? "default" : "outline"} className="h-8 gap-1.5" disabled={loading} onClick={() => inputs.current[e.libelle]?.click()}>
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : e.statut === "A_FOURNIR" ? <Upload className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {e.statut === "A_FOURNIR" ? "Déposer" : "Remplacer"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="px-4 py-2 text-[11px] text-muted-foreground">Formats acceptés : PDF, JPEG, PNG, WebP (max 8 Mo).</p>
    </div>
  );
}
