"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RotateCcw, LifeBuoy } from "lucide-react";
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
    // Remonte l'erreur à Sentry (no-op si aucun DSN configuré).
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
      <h2 className="mt-4 text-lg font-semibold">Un problème est survenu</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Cette page n&apos;a pas pu s&apos;afficher. Vos données ne sont pas perdues —
        réessayez dans un instant. Si le problème persiste, contactez le support en
        indiquant le code ci-dessous.
      </p>
      {error?.digest && (
        <p className="mt-3 text-xs text-muted-foreground">
          Code de référence :{" "}
          <span className="font-mono font-medium text-foreground">{error.digest}</span>
        </p>
      )}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>
          <RotateCcw className="mr-1.5 h-4 w-4" /> Réessayer
        </Button>
        <Button variant="outline" render={<Link href="/support" />}>
          <LifeBuoy className="mr-1.5 h-4 w-4" /> Contacter le support
        </Button>
      </div>
      {/* Détail technique replié — utile au support, jamais mis en avant. */}
      <details className="mt-6 text-left">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          Détail technique (pour le support)
        </summary>
        <pre className="mt-2 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
          {error?.message || "Erreur inconnue"}
          {error?.digest ? `\n\ndigest: ${error.digest}` : ""}
        </pre>
      </details>
    </div>
  );
}
