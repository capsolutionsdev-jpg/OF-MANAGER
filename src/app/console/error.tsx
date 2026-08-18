"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Error boundary du segment /console : contient toute erreur d'une page console
 * (au lieu de faire tomber toute l'app) et propose un ré-essai qui ne recharge que
 * ce segment. Affiche la réf. `digest` — à communiquer pour retrouver la trace
 * exacte côté logs/Sentry.
 */
export default function ConsoleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[console] erreur de segment", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <AlertTriangle className="h-10 w-10 text-amber-500" />
      <h2 className="text-lg font-semibold">Cette page console a rencontré un problème</h2>
      <p className="text-sm text-muted-foreground">
        C&apos;est souvent temporaire (connexion à la base). Réessayez ; si le problème persiste,
        l&apos;erreur est journalisée
        {error.digest ? (
          <>
            {" "}
            (réf. <code className="rounded bg-muted px-1">{error.digest}</code>)
          </>
        ) : null}
        .
      </p>
      <Button onClick={reset}>
        <RotateCw className="mr-1.5 h-4 w-4" /> Réessayer
      </Button>
    </div>
  );
}
