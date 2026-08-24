import type { Metadata } from "next";
import { Suspense } from "react";
import { QrCode, CalendarClock, BadgeCheck, Lock, ShieldCheck } from "lucide-react";
import { VerificationForm } from "@/components/verification/verification-form";

export const metadata: Metadata = {
  title: "Vérifier l'authenticité d'un titre — OF MANAGER",
  description:
    "Service de vérification OF MANAGER : confirmez en ligne l'authenticité et la validité d'un titre délivré par un organisme de formation (diplôme SSIAP, attestation de recyclage, remise à niveau, habilitation électrique…) à partir de son numéro et de la date de naissance du titulaire.",
  robots: { index: true, follow: true },
};

const STEPS = [
  {
    icon: QrCode,
    t: "Le numéro du titre",
    d: "Il figure sur le document. Ou scannez son QR code : le numéro se remplit tout seul.",
  },
  {
    icon: CalendarClock,
    t: "La date de naissance",
    d: "Clé de contrôle du titulaire. Un document seul ne suffit pas à obtenir une réponse.",
  },
  {
    icon: BadgeCheck,
    t: "Le résultat",
    d: "Immédiat : authentique, expiré ou non reconnu — avec l'organisme qui l'a délivré.",
  },
];

/** Sceau de vérification — bouclier dégradé lumineux dans un anneau cranté. */
function VerificationSeal({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ofmSeal" x1="24" y1="24" x2="96" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="57" stroke="#fff" strokeOpacity="0.25" strokeWidth="1" />
      <circle
        cx="60" cy="60" r="49" stroke="#fff" strokeOpacity="0.45" strokeWidth="6"
        strokeDasharray="0.5 6.1" strokeLinecap="round"
      />
      <circle cx="60" cy="60" r="40" fill="#fff" fillOpacity="0.07" />
      <path d="M60 29 L83 38.5 V60 C83 74.5 73 85 60 91 C47 85 37 74.5 37 60 V38.5 Z" fill="url(#ofmSeal)" />
      <path
        d="M50.5 60.5 l6.5 6.5 L71 53" stroke="#0a1533" strokeWidth="5"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export default function VerificationPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a1533] text-white">
      <style>{`
        @keyframes ofmRise{to{opacity:1;transform:none}}
        @keyframes ofmFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes ofmGlow{0%,100%{opacity:.4}50%{opacity:.8}}
        @keyframes ofmDrift{0%,100%{transform:translate(0,0)}50%{transform:translate(26px,-20px)}}
        .ofm-rise{opacity:0;transform:translateY(22px);animation:ofmRise .7s cubic-bezier(.2,.7,.2,1) forwards}
        .ofm-float{animation:ofmFloat 6s ease-in-out infinite}
        .ofm-glow{animation:ofmGlow 5s ease-in-out infinite}
        .ofm-drift{animation:ofmDrift 20s ease-in-out infinite}
        @media (prefers-reduced-motion: reduce){
          .ofm-rise{opacity:1;transform:none;animation:none}
          .ofm-float,.ofm-glow,.ofm-drift{animation:none}
        }
      `}</style>

      {/* Fond : dégradé profond + orbes flous */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(125%_120%_at_50%_-10%,#22409a_0%,#0e1e4d_45%,#080f2c_100%)]" />
        <div className="ofm-drift absolute -left-24 top-6 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
        <div
          className="ofm-drift absolute -right-28 top-40 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl"
          style={{ animationDelay: "-7s" }}
        />
        <div
          className="ofm-drift absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl"
          style={{ animationDelay: "-13s" }}
        />
      </div>

      {/* Barre de marque */}
      <div className="relative z-10 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <span className="inline-flex items-center rounded-lg bg-white px-2 py-1 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ofmanager-logo.png" alt="OF MANAGER" className="h-7 w-auto sm:h-8" />
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70">
            <Lock className="h-3.5 w-3.5" />
            Vérification des titres délivrés
          </span>
        </div>
      </div>

      {/* Hero */}
      <header className="relative z-10 mx-auto max-w-3xl px-4 pt-16 text-center sm:pt-20">
        <div className="relative mx-auto mb-7 w-fit">
          <div className="ofm-glow absolute inset-0 -z-10 rounded-full bg-cyan-400/40 blur-2xl" />
          <VerificationSeal className="ofm-float h-24 w-24 drop-shadow-[0_8px_30px_rgba(56,189,248,0.35)] sm:h-28 sm:w-28" />
        </div>
        <h1
          className="ofm-rise text-balance text-4xl font-bold tracking-tight sm:text-6xl"
          style={{ animationDelay: ".05s" }}
        >
          Vérifier l&apos;authenticité{" "}
          <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
            d&apos;un titre
          </span>
        </h1>
        <p
          className="ofm-rise mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/70 sm:text-lg"
          style={{ animationDelay: ".12s" }}
        >
          Confirmez qu&apos;un diplôme, une attestation ou une habilitation a bien été délivré par un
          organisme de formation — et qu&apos;il est toujours valide — à partir de son numéro et de la
          date de naissance du titulaire.
        </p>
        <p
          className="ofm-rise mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-md"
          style={{ animationDelay: ".18s" }}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-cyan-300" />
          Service de vérification fourni par <span className="font-semibold text-white">OF MANAGER</span>
        </p>
      </header>

      {/* Formulaire (action principale, carte vitrée) */}
      <section
        className="ofm-rise relative z-10 mx-auto mt-10 max-w-xl px-4"
        style={{ animationDelay: ".24s" }}
      >
        <Suspense fallback={<div className="h-80 animate-pulse rounded-3xl bg-white/10" />}>
          <VerificationForm />
        </Suspense>
      </section>

      {/* Comment ça marche (cartes vitrées) */}
      <section className="relative z-10 mx-auto max-w-4xl px-4 py-16 sm:py-20">
        <h2 className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
          Comment ça marche
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, t, d }, i) => (
            <li
              key={t}
              className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 shadow-xl backdrop-blur-md transition-colors hover:bg-white/[0.1]"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-sm font-bold text-white shadow-lg shadow-blue-500/30">
                  {i + 1}
                </span>
                <Icon className="h-5 w-5 text-cyan-300" />
              </div>
              <p className="text-sm font-semibold text-white">{t}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/60">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Pied de page */}
      <footer className="relative z-10 border-t border-white/10 bg-white/[0.03]">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 py-8 text-center">
          <span className="inline-flex items-center rounded-lg bg-white px-2 py-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ofmanager-logo.png" alt="OF MANAGER" className="h-6 w-auto" />
          </span>
          <p className="max-w-2xl text-xs leading-relaxed text-white/50">
            Système de vérification propulsé par <span className="font-semibold text-white/80">OF MANAGER</span>, la
            plateforme des organismes de formation. Aucune liste de titulaires n&apos;est consultable : seule la
            personne disposant du numéro <em>et</em> de la date de naissance peut confirmer la validité d&apos;un titre.
          </p>
        </div>
      </footer>
    </main>
  );
}
