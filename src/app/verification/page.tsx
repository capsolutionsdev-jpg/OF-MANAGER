import type { Metadata } from "next";
import { Suspense } from "react";
import { ShieldCheck, QrCode, CalendarClock, BadgeCheck } from "lucide-react";
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
    t: "1 — Le numéro du titre",
    d: "Il figure sur le document. Ou scannez son QR code : le numéro se remplit tout seul.",
  },
  {
    icon: CalendarClock,
    t: "2 — La date de naissance",
    d: "Clé de contrôle du titulaire. Un document seul ne suffit pas à obtenir une réponse.",
  },
  {
    icon: BadgeCheck,
    t: "3 — Le résultat",
    d: "Immédiat : valide, expiré ou non reconnu — avec l'organisme qui l'a délivré.",
  },
];

export default function VerificationPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Barre de marque OF MANAGER */}
      <div className="border-b bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ofmanager-logo.png" alt="OF MANAGER" className="h-7 w-auto" />
          <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
            Vérification des titres délivrés
          </span>
        </div>
      </div>

      {/* Hero */}
      <header className="border-b bg-gradient-to-b from-primary/5 to-transparent">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Vérifier l&apos;authenticité d&apos;un titre</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Confirmez qu&apos;un diplôme, une attestation ou une habilitation a bien été délivré par un
            organisme de formation — et qu&apos;il est toujours valide — à partir de son numéro et de la
            date de naissance du titulaire.
          </p>
          <p className="mt-5 inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Service de vérification fourni par <span className="font-semibold text-foreground">OF MANAGER</span>
          </p>
        </div>
      </header>

      {/* Mode d'emploi */}
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="mb-5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Comment ça marche
        </h2>
        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-xl border bg-card p-4">
              <Icon className="mb-2 h-6 w-6 text-primary" />
              <p className="text-sm font-semibold">{t}</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>

        <Suspense fallback={<div className="mx-auto h-64 max-w-xl animate-pulse rounded-2xl bg-muted" />}>
          <VerificationForm />
        </Suspense>
      </section>

      {/* Pied de page */}
      <footer className="border-t">
        <div className="mx-auto max-w-3xl px-4 py-6 text-center text-xs leading-relaxed text-muted-foreground">
          Système de vérification propulsé par <span className="font-semibold text-foreground">OF MANAGER</span>, la
          plateforme des organismes de formation. Aucune liste de titulaires n&apos;est consultable : seule la
          personne disposant du numéro <em>et</em> de la date de naissance peut confirmer la validité d&apos;un titre.
        </div>
      </footer>
    </main>
  );
}
