"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, ShieldAlert, Search, Loader2 } from "lucide-react";

type MatchResult = {
  match: true;
  titulaire: string;
  titre: string;
  numero: string;
  date_delivrance: string | null;
  date_fin_validite: string | null;
  statut: "valide" | "expiré";
  organisme: string;
};
type NoMatch = { match: false; message: string };
type Result = MatchResult | NoMatch;

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

const fdate = (d: string | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("fr-FR");
};

export function VerificationForm() {
  const params = useSearchParams();
  const [numero, setNumero] = useState("");
  const [dob, setDob] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const widgetRef = useRef<HTMLDivElement>(null);

  // Préremplissage du numéro depuis le QR (?n=…). La date de naissance reste
  // TOUJOURS à saisir manuellement (un document seul ne suffit pas).
  useEffect(() => {
    const n = params.get("n");
    if (n) setNumero(n);
  }, [params]);

  // Chargement + rendu du widget Turnstile (si configuré).
  useEffect(() => {
    if (!SITE_KEY || !widgetRef.current) return;
    const render = () => {
      if (window.turnstile && widgetRef.current && !widgetRef.current.hasChildNodes()) {
        window.turnstile.render(widgetRef.current, {
          sitekey: SITE_KEY,
          callback: (t: string) => setToken(t),
          "expired-callback": () => setToken(""),
        });
      }
    };
    if (window.turnstile) {
      render();
    } else {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.defer = true;
      s.onload = render;
      document.head.appendChild(s);
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!numero.trim() || !dob) {
      setError("Renseignez le numéro et la date de naissance.");
      return;
    }
    if (SITE_KEY && !token) {
      setError("Veuillez valider la vérification anti-robot.");
      return;
    }
    setLoading(true);
    try {
      // Même-origine : la page et l'API /api/verification sont hébergées ensemble.
      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero: numero.trim(), date_naissance: dob, turnstileToken: token }),
      });
      const data: Result = await res.json();
      setResult(data);
    } catch {
      setError("Service momentanément indisponible. Réessayez dans un instant.");
    } finally {
      setLoading(false);
      if (SITE_KEY && window.turnstile) {
        window.turnstile.reset();
        setToken("");
      }
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <form onSubmit={onSubmit} className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="space-y-4">
          <div>
            <label htmlFor="numero" className="mb-1 block text-sm font-medium">
              Numéro du titre
            </label>
            <input
              id="numero"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Ex. RECYC-SSIAP1-2026-00001-3"
              autoComplete="off"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label htmlFor="dob" className="mb-1 block text-sm font-medium">
              Date de naissance du titulaire
            </label>
            <input
              id="dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {SITE_KEY && <div ref={widgetRef} className="min-h-[65px]" />}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Vérifier
          </button>
        </div>
      </form>

      {result && <ResultCard result={result} />}

      <p className="mx-auto mt-6 max-w-xl text-center text-xs leading-relaxed text-muted-foreground">
        Ce service permet uniquement de vérifier un titre dont vous connaissez déjà le numéro et la
        date de naissance du titulaire. Aucune liste de titulaires n&apos;est consultable.
      </p>
    </div>
  );
}

function ResultCard({ result }: { result: Result }) {
  if (!result.match) {
    return (
      <div className="mt-6 rounded-2xl border bg-muted/40 p-6 text-center">
        <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">{result.message}</p>
      </div>
    );
  }
  const expired = result.statut === "expiré";
  const tone = expired
    ? { border: "border-amber-300", bg: "bg-amber-50 dark:bg-amber-950/30", icon: "text-amber-600", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" }
    : { border: "border-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-950/30", icon: "text-emerald-600", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" };
  const rows: [string, string | null][] = [
    ["Titulaire", result.titulaire],
    ["Titre", result.titre],
    ["Numéro", result.numero],
    ["Délivré le", fdate(result.date_delivrance)],
    ["Fin de validité", result.date_fin_validite ? fdate(result.date_fin_validite) : "Sans expiration"],
    ["Organisme", result.organisme],
  ];
  return (
    <div className={`mt-6 rounded-2xl border ${tone.border} ${tone.bg} p-6`}>
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className={`h-6 w-6 ${tone.icon}`} />
        <span className="text-base font-semibold">Titre authentifié</span>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${tone.badge}`}>
          {result.statut}
        </span>
      </div>
      <dl className="divide-y divide-black/5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-4 py-1.5">
            <dt className="w-36 shrink-0 text-muted-foreground">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
