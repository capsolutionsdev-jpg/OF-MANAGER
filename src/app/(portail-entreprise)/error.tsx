"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Écran d'erreur DÉDIÉ au portail client B2B (rôle ENTREPRISE). Sans lui, toute
 * erreur du portail (layout compris : lectures session/base) remontait jusqu'à
 * global-error.tsx — un écran générique sans aucun détail exploitable (cf.
 * incident prod du 21/08/2026). Placé au niveau du GROUPE (portail-entreprise)
 * pour attraper aussi les erreurs de espace-entreprise/layout.tsx.
 */
export default function PortailEntrepriseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[portail-entreprise error]", error);
    // Remonte l'erreur à Sentry (no-op si aucun DSN configuré).
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
      <h2 className="mt-4 text-lg font-semibold">Votre espace client n&apos;a pas pu s&apos;afficher</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Une erreur est survenue lors du chargement. Réessayez ; si le problème persiste,
        communiquez le détail ci-dessous à votre organisme de formation.
      </p>
      <pre className="mt-4 overflow-auto rounded-lg border bg-muted/40 p-3 text-left text-xs text-muted-foreground">
        {error?.message || "Erreur inconnue"}
        {error?.digest ? `\n\ndigest: ${error.digest}` : ""}
      </pre>
      <div className="mt-4 flex justify-center gap-2">
        <Button onClick={reset}>
          <RotateCcw className="mr-1.5 h-4 w-4" /> Réessayer
        </Button>
      </div>
    </div>
  );
}
