"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, ShieldAlert, Search, Loader2, QrCode, CalendarClock } from "lucide-react";

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
    <div>
      <form onSubmit={onSubmit} className="rounded-2xl border bg-card p-6 shadow-xl ring-1 ring-black/[0.03] sm:p-8">
        <div className="mb-5 flex items-center gap-2 border-b pb-4">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">Vérifier un titre</h2>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="numero" className="mb-1.5 block text-sm font-medium">
              Numéro du titre
            </label>
            <div className="relative">
              <QrCode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="numero"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ex. RECYC-SSIAP1-2026-00001-3"
                autoComplete="off"
                className="w-full rounded-xl border bg-background py-3 pl-9 pr-3 font-mono text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Figure sur le document — ou scannez son QR code, il se remplit tout seul.
            </p>
          </div>

          <div>
            <label htmlFor="dob" className="mb-1.5 block text-sm font-medium">
              Date de naissance du titulaire
            </label>
            <div className="relative">
              <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-xl border bg-background py-3 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Clé de contrôle : un document seul ne suffit pas à obtenir une réponse.
            </p>
          </div>

          {SITE_KEY && <div ref={widgetRef} className="min-h-[65px]" />}

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Vérifier le titre
          </button>
        </div>
      </form>

      {result && <ResultCard result={result} />}

      <p className="mx-auto mt-5 max-w-md text-center text-xs leading-relaxed text-muted-foreground">
        Ce service permet uniquement de vérifier un titre dont vous connaissez déjà le numéro et la
        date de naissance du titulaire. Aucune liste de titulaires n&apos;est consultable.
      </p>
    </div>
  );
}

function ResultCard({ result }: { result: Result }) {
  if (!result.match) {
    return (
      <div className="mt-5 rounded-2xl border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <p className="text-base font-semibold">Titre non reconnu</p>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
          {result.message} Vérifiez le numéro et la date de naissance saisis. S&apos;ils sont exacts et que le
          document vous paraît authentique, contactez directement{" "}
          <b className="text-foreground">l&apos;organisme de formation qui l&apos;a délivré</b> — ses coordonnées
          figurent sur le document.
        </p>
      </div>
    );
  }

  const expired = result.statut === "expiré";
  const tone = expired
    ? {
        ring: "ring-amber-500/30", bg: "bg-amber-50 dark:bg-amber-950/25",
        chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
        seal: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      }
    : {
        ring: "ring-emerald-500/30", bg: "bg-emerald-50 dark:bg-emerald-950/25",
        chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        seal: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      };
  const rows: [string, string | null][] = [
    ["Titulaire", result.titulaire],
    ["Titre", result.titre],
    ["Numéro", result.numero],
    ["Délivré le", fdate(result.date_delivrance)],
    ["Organisme", result.organisme],
  ];
  return (
    <div className={`mt-5 rounded-2xl border bg-card p-6 shadow-lg ring-1 ${tone.ring}`}>
      <div className={`-m-6 mb-5 flex items-center gap-3 rounded-t-2xl border-b p-6 ${tone.bg}`}>
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${tone.seal}`}>
          <ShieldCheck className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight">Titre authentifié</p>
          <p className="text-xs text-muted-foreground">Enregistré au registre de l&apos;organisme émetteur.</p>
        </div>
        <span className={`ml-auto shrink-0 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tone.chip}`}>
          {result.statut}
        </span>
      </div>
      <dl className="divide-y text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-4 py-2">
            <dt className="w-32 shrink-0 text-muted-foreground">{k}</dt>
            <dd className="min-w-0 break-words font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
