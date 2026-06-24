"use client";

import { useState } from "react";
import { GraduationCap, Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Result = { civicToken: string; email: string; loginUrl: string };

/**
 * Active (ou régénère) l'accès e-learning « examen civique » d'un candidat.
 * La plateforme génère un code (civicToken) que le candidat saisira sur le
 * site vitrine (onglet « Code d'accès ») pour retrouver son parcours.
 */
export function CivicAccessButton({
  candidatId,
  hasToken,
}: {
  candidatId: string;
  hasToken: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function provision(regenerate = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/civique/candidates/${candidatId}/provision${regenerate ? "?regenerate=1" : ""}`,
        { method: "POST" },
      );
      if (!res.ok) {
        setError("Échec de l'activation. Vérifiez vos droits.");
        return;
      }
      setResult((await res.json()) as Result);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (!result) return;
    void navigator.clipboard.writeText(result.civicToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-4 rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <GraduationCap className="h-4 w-4" /> Accès e-learning examen civique
        </p>
        {!result && (
          <Button size="sm" variant="outline" onClick={() => provision(false)} disabled={loading}>
            {loading ? "Activation…" : hasToken ? "Afficher le code" : "Activer l'accès"}
          </Button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {result && (
        <div className="mt-2 space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-background px-2 py-1 font-mono text-xs break-all">
              {result.civicToken}
            </code>
            <Button size="sm" variant="ghost" onClick={copy} title="Copier le code">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => provision(true)}
              disabled={loading}
              title="Régénérer un nouveau code"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            À transmettre au candidat avec son e-mail ({result.email}). Connexion :{" "}
            <a className="underline" href={result.loginUrl} target="_blank" rel="noreferrer">
              {result.loginUrl}
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
