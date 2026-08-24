import type { Metadata } from "next";
import { Suspense } from "react";
import { QrCode, CalendarClock, BadgeCheck, Lock } from "lucide-react";
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

/** Sceau de vérification — motif officiel (anneau cranté + bouclier + coche). */
function VerificationSeal({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="57" stroke="currentColor" strokeWidth="1" opacity="0.25" />
      <circle
        cx="60" cy="60" r="49" stroke="currentColor" strokeWidth="6"
        strokeDasharray="0.5 6.1" strokeLinecap="round" opacity="0.4"
      />
      <circle cx="60" cy="60" r="40" fill="currentColor" opacity="0.08" />
      <path d="M60 29 L83 38.5 V60 C83 74.5 73 85 60 91 C47 85 37 74.5 37 60 V38.5 Z" fill="currentColor" />
      <path
        d="M50.5 60.5 l6.5 6.5 L71 53" stroke="#fff" strokeWidth="4.6"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export default function VerificationPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Barre de marque OF MANAGER */}
      <div className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ofmanager-logo.png" alt="OF MANAGER" className="h-9 w-auto sm:h-10" />
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Vérification des titres délivrés
          </span>
        </div>
      </div>

      {/* Hero */}
      <header className="relative overflow-hidden border-b">
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-primary/[0.09] via-background to-background" />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgb(100 116 139 / 0.10) 1px, transparent 0)",
            backgroundSize: "24px 24px",
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 0%, black, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 0%, black, transparent 75%)",
          }}
        />
        <div aria-hidden className="absolute left-1/2 top-[-3rem] h-64 w-64 -translate-x-1/2 rounded-full bg-primary/25 opacity-40 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-4 pb-14 pt-14 text-center sm:pt-16">
          <VerificationSeal className="mx-auto h-20 w-20 text-primary drop-shadow-sm sm:h-24 sm:w-24" />
          <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Vérifier l&apos;authenticité d&apos;un titre
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
            Confirmez qu&apos;un diplôme, une attestation ou une habilitation a bien été délivré par un
            organisme de formation — et qu&apos;il est toujours valide — à partir de son numéro et de la
            date de naissance du titulaire.
          </p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border bg-card/70 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
            <VerificationSeal className="h-4 w-4 text-primary" />
            Service de vérification fourni par <span className="font-semibold text-foreground">OF MANAGER</span>
          </p>
        </div>
      </header>

      {/* Formulaire (action principale) */}
      <section className="relative mx-auto -mt-6 max-w-xl px-4 sm:-mt-8">
        <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl border bg-card shadow-lg" />}>
          <VerificationForm />
        </Suspense>
      </section>

      {/* Mode d'emploi */}
      <section className="mx-auto max-w-4xl px-4 py-14 sm:py-16">
        <h2 className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Comment ça marche
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, t, d }, i) => (
            <li key={t} className="relative rounded-2xl border bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary tabular-nums">
                  {i + 1}
                </span>
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-semibold">{t}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Pied de page */}
      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 py-8 text-center">
          <img
            /* eslint-disable-next-line @next/next/no-img-element */
            src="/ofmanager-logo.png"
            alt="OF MANAGER"
            className="h-7 w-auto opacity-80"
          />
          <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Système de vérification propulsé par <span className="font-semibold text-foreground">OF MANAGER</span>, la
            plateforme des organismes de formation. Aucune liste de titulaires n&apos;est consultable : seule la
            personne disposant du numéro <em>et</em> de la date de naissance peut confirmer la validité d&apos;un titre.
          </p>
        </div>
      </footer>
    </main>
  );
}
