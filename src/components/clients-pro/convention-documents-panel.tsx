"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileStack, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publierEtapeDocuments, type EtapeDocuments } from "@/lib/actions/document-lifecycle-actions";

const ETAPES: { key: EtapeDocuments; label: string; hint: string }[] = [
  { key: "convention", label: "1 — Convention signée", hint: "Règlement intérieur, CGV, convocation" },
  { key: "entree", label: "2 — 1er jour", hint: "Attestation d'entrée en formation" },
  {
    key: "fin",
    label: "3 — Dernier jour",
    hint: "Attestation de fin, certificat, réussite (si examen & réussi), enquête de satisfaction",
  },
];

export function ConventionDocumentsPanel({
  conventionId,
  counts,
}: {
  conventionId: string;
  counts?: { convention: number; entree: number; fin: number };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const countFor = (k: EtapeDocuments) => counts?.[k] ?? 0;

  function publier(etape: EtapeDocuments) {
    start(async () => {
      const res = await publierEtapeDocuments(conventionId, etape);
      if (!res.ok) {
        toast.error(res.error ?? "La publication a échoué.");
        return;
      }
      toast.success(`${res.count ?? 0} document(s) mis à disposition dans l'espace client.`);
      router.refresh();
    });
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border bg-muted/20 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <FileStack className="h-3.5 w-3.5" /> Documents mis à disposition dans l&apos;espace client
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {ETAPES.map((e) => (
          <div key={e.key} className="flex flex-col rounded-md border bg-card p-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              {e.label}
              {countFor(e.key) > 0 && (
                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                  {countFor(e.key)} publié{countFor(e.key) > 1 ? "s" : ""}
                </span>
              )}
            </p>
            <p className="mt-0.5 flex-1 text-[11px] leading-snug text-muted-foreground">{e.hint}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full"
              onClick={() => publier(e.key)}
              disabled={pending}
            >
              {pending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
              {countFor(e.key) > 0 ? "Republier" : "Publier"}
            </Button>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Publie les documents (étape par étape) dans l&apos;espace du client. Idempotent : réappuyer ne
        crée pas de doublon.
      </p>
    </div>
  );
}
