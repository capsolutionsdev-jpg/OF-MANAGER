"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, PenLine, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignaturePad } from "@/components/ui/signature-pad";
import { signerInscriptionSurPlace } from "@/lib/actions/parcours-actions";

/**
 * Signature « sur place » (candidat présent) : consultation des documents
 * contractuels (contrat/convention + règlement intérieur + CGV) → case
 * « consulté & accepté » → signature manuscrite. Confirme l'inscription (VALIDEE),
 * génère le dossier signé et déclenche convocation + accès e-learning.
 */
export function SignerSurPlaceDialog({
  inscriptionId,
  open,
  onOpenChange,
}: {
  inscriptionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lu, setLu] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  function reset() {
    setLu(false);
    setDataUrl(null);
  }

  function submit() {
    if (!lu) {
      toast.error("Confirmez d'abord que le candidat a consulté les documents.");
      return;
    }
    if (!dataUrl) {
      toast.error("Faites signer le candidat dans le cadre.");
      return;
    }
    startTransition(async () => {
      const res = await signerInscriptionSurPlace(inscriptionId, dataUrl);
      if (res.ok) {
        toast.success("Inscription confirmée et signée.");
        onOpenChange(false);
        reset();
        router.refresh();
      } else {
        toast.error(res.error ?? "Erreur.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirmer &amp; signer l&apos;inscription (sur place)</DialogTitle>
          <DialogDescription>
            Faites consulter les documents au candidat, puis recueillez sa signature.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            render={
              <a
                href={`/documents/${inscriptionId}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <FileText className="mr-2 h-4 w-4" />
            Consulter les documents (contrat, règlement intérieur, CGV)
            <ExternalLink className="ml-auto h-3.5 w-3.5" />
          </Button>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-primary"
              checked={lu}
              onChange={(e) => setLu(e.target.checked)}
            />
            <span>
              Le candidat a <b>consulté et accepté</b> le contrat de formation, le
              règlement intérieur et les conditions générales (CGV).
            </span>
          </label>

          <div>
            <p className="mb-1.5 text-sm font-medium">Signature du candidat :</p>
            <SignaturePad onChange={setDataUrl} />
          </div>

          <p className="text-[11px] text-muted-foreground">
            La signature manuscrite, horodatée (IP enregistrée) et recueillie par le
            collaborateur, vaut signature de l&apos;inscription. Le candidat recevra ses
            documents signés et sa convocation par e-mail.
          </p>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={isPending || !lu || !dataUrl}>
              <PenLine className="mr-1.5 h-4 w-4" />
              {isPending ? "Signature…" : "Confirmer & signer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
