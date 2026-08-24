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

const inputCx =
  "w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/25";

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
      <form
        onSubmit={onSubmit}
        className="rounded-3xl border border-white/60 bg-white/95 p-6 text-slate-900 shadow-[0_25px_70px_-20px_rgba(2,10,40,0.7)] ring-1 ring-black/[0.04] backdrop-blur-2xl sm:p-8"
      >
        <div className="mb-5 flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-semibold text-slate-900">Vérifier un titre</h2>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="numero" className="mb-1.5 block text-sm font-medium text-slate-700">
              Numéro du titre
            </label>
            <div className="relative">
              <QrCode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="numero"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ex. RECYC-SSIAP1-2026-00001-3"
                autoComplete="off"
                className={`${inputCx} font-mono`}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Figure sur le document — ou scannez son QR code, il se remplit tout seul.
            </p>
          </div>

          <div>
            <label htmlFor="dob" className="mb-1.5 block text-sm font-medium text-slate-700">
              Date de naissance du titulaire
            </label>
            <div className="relative">
              <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className={inputCx}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Clé de contrôle : un document seul ne suffit pas à obtenir une réponse.
            </p>
          </div>

          {SITE_KEY && <div ref={widgetRef} className="min-h-[65px]" />}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Vérifier le titre
          </button>
        </div>
      </form>

      {result && <ResultCard result={result} />}

      <p className="mx-auto mt-5 max-w-md text-center text-xs leading-relaxed text-white/50">
        Ce service permet uniquement de vérifier un titre dont vous connaissez déjà le numéro et la
        date de naissance du titulaire. Aucune liste de titulaires n&apos;est consultable.
      </p>
    </div>
  );
}

function ResultCard({ result }: { result: Result }) {
  if (!result.match) {
    return (
      <div className="mt-5 rounded-3xl border border-white/60 bg-white/95 p-6 text-center text-slate-900 shadow-2xl ring-1 ring-black/[0.04] backdrop-blur-2xl">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <p className="text-base font-semibold">Titre non reconnu</p>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
          {result.message} Vérifiez le numéro et la date de naissance saisis. S&apos;ils sont exacts et que le
          document vous paraît authentique, contactez directement{" "}
          <b className="text-slate-700">l&apos;organisme de formation qui l&apos;a délivré</b> — ses coordonnées
          figurent sur le document.
        </p>
      </div>
    );
  }

  const expired = result.statut === "expiré";
  const band = expired
    ? "from-amber-500 to-orange-500"
    : "from-emerald-500 to-teal-500";
  const chip = expired
    ? "bg-amber-100 text-amber-700"
    : "bg-emerald-100 text-emerald-700";
  const rows: [string, string | null][] = [
    ["Titulaire", result.titulaire],
    ["Titre", result.titre],
    ["Numéro", result.numero],
    ["Délivré le", fdate(result.date_delivrance)],
    ["Organisme", result.organisme],
  ];
  return (
    <div className="mt-5 overflow-hidden rounded-3xl border border-white/60 bg-white/95 text-slate-900 shadow-2xl ring-1 ring-black/[0.04] backdrop-blur-2xl">
      <div className={`flex items-center gap-3 bg-gradient-to-r ${band} px-6 py-5 text-white`}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur">
          <ShieldCheck className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight">Titre authentifié</p>
          <p className="text-xs text-white/85">Enregistré au registre de l&apos;organisme émetteur.</p>
        </div>
        <span className={`ml-auto shrink-0 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${chip}`}>
          {result.statut}
        </span>
      </div>
      <dl className="divide-y divide-slate-100 px-6 py-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-4 py-2.5">
            <dt className="w-32 shrink-0 text-slate-500">{k}</dt>
            <dd className="min-w-0 break-words font-medium text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
