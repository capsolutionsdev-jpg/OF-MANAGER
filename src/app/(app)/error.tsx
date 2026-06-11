"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
      <h2 className="mt-4 text-lg font-semibold">Cette page n&apos;a pas pu s&apos;afficher</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Une erreur est survenue lors du chargement. Détail technique ci-dessous —
        communiquez-le si le problème persiste.
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
