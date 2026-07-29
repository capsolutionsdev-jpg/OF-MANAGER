"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ScanLine, Loader2 } from "lucide-react";
import { MultiPageScanner } from "@/components/scan/multi-page-scanner";
import { attachScannedPiece } from "@/lib/actions/scan-actions";

/**
 * Bouton « Scanner (tablette) » pour l'accueil : choix de la pièce ciblée →
 * scanner multi-pages → PDF rattaché au dossier du candidat. Réservé au staff
 * (l'action serveur vérifie le rôle).
 */
export function ScanDocsButton({
  inscriptionId,
  piecesAttendues,
}: {
  inscriptionId: string;
  piecesAttendues: string[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "choose" | "scan" | "saving">("idle");
  const [piece, setPiece] = useState<string>(piecesAttendues[0] ?? "");

  async function handleComplete(pdfDataUrl: string) {
    setStep("saving");
    const res = await attachScannedPiece(inscriptionId, {
      dataUrl: pdfDataUrl,
      piece: piece || undefined,
      filename: "Document scanné.pdf",
    });
    if (res.ok) {
      toast.success(piece ? `« ${piece} » rattaché(e) au dossier.` : "Document scanné rattaché au dossier.");
      setStep("idle");
      router.refresh();
    } else {
      toast.error(res.error ?? "Échec du rattachement.");
      setStep("choose");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setStep("choose")}
        className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        title="Scanner des documents avec la caméra (tablette / mobile)"
      >
        <ScanLine className="h-3.5 w-3.5" /> Scanner
      </button>

      {(step === "choose" || step === "saving") && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl border bg-card p-4 shadow-lg">
            <h3 className="text-sm font-semibold">Scanner un document</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Choisissez la pièce à laquelle rattacher le scan, puis capturez les pages.
            </p>
            <label className="mt-3 block text-xs font-medium text-muted-foreground">Pièce du dossier</label>
            <select
              value={piece}
              onChange={(e) => setPiece(e.target.value)}
              disabled={step === "saving"}
              className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm"
            >
              {piecesAttendues.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
              <option value="">Autre document</option>
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStep("idle")}
                disabled={step === "saving"}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => setStep("scan")}
                disabled={step === "saving"}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {step === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                {step === "saving" ? "Enregistrement…" : "Démarrer le scan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "scan" && (
        <MultiPageScanner onComplete={handleComplete} onCancel={() => setStep("choose")} />
      )}
    </>
  );
}
