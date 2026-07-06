"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, FileText, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markDocsLus } from "@/lib/actions/parcours-actions";

/**
 * Étape 2 du parcours : le candidat consulte ses documents contractuels
 * (convention, contrat, règlement intérieur, programme…) puis atteste les avoir
 * lus. La lecture ouvre le PDF regroupé ; l'attestation débloque la signature.
 */
export function DocsLire({
  token,
  documents,
}: {
  token: string;
  documents: string[];
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [accept, setAccept] = useState(false);
  const [isPending, startTransition] = useTransition();

  function confirmer() {
    if (!accept) {
      toast.error("Merci de confirmer que vous avez lu les documents.");
      return;
    }
    startTransition(async () => {
      const res = await markDocsLus(token);
      if (res.ok) {
        toast.success("Documents consultés. Vous pouvez signer.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Une erreur est survenue.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Avant de signer, merci de consulter attentivement l&apos;ensemble de vos
        documents contractuels :
      </p>

      <ul className="space-y-1.5 text-sm">
        {documents.map((d) => (
          <li key={d} className="flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            {d}
          </li>
        ))}
      </ul>

      <a
        href={`/parcours/${token}/documents?preview=1`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setOuvert(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
      >
        <ExternalLink className="h-4 w-4" /> Lire les documents (PDF)
      </a>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          checked={accept}
          onChange={(e) => setAccept(e.target.checked)}
        />
        <span>
          Je confirme avoir consulté et lu l&apos;ensemble de mes documents
          contractuels{ouvert ? "" : " (ouvrez d'abord le PDF ci-dessus)"}.
        </span>
      </label>

      <Button onClick={confirmer} disabled={isPending || !accept} className="w-full">
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="mr-2 h-4 w-4" />
        )}
        J&apos;ai lu mes documents — passer à la signature
      </Button>
    </div>
  );
}
