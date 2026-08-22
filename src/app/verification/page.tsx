import type { Metadata } from "next";
import { Suspense } from "react";
import { ShieldCheck, QrCode, Lock } from "lucide-react";
import { VerificationForm } from "@/components/verification/verification-form";

export const metadata: Metadata = {
  title: "Vérifier l'authenticité d'un titre",
  description:
    "Vérifiez en ligne l'authenticité et la validité d'un titre délivré (diplôme SSIAP, attestation de recyclage, remise à niveau, habilitation…) à partir de son numéro et de la date de naissance du titulaire.",
  robots: { index: true, follow: true },
};

const STEPS = [
  { icon: QrCode, t: "Scannez ou saisissez", d: "Le numéro figure sur le document (ou son QR code)." },
  { icon: Lock, t: "Date de naissance", d: "Clé de contrôle : un document seul ne suffit pas." },
  { icon: ShieldCheck, t: "Réponse immédiate", d: "Valide, expiré ou non reconnu." },
];

export default function VerificationPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card/60">
        <div className="mx-auto max-w-3xl px-4 py-10 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Vérification d&apos;un titre</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Confirmez l&apos;authenticité et la validité d&apos;un document à partir de son numéro et
            de la date de naissance du titulaire.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-xl border bg-card p-4 text-center">
              <Icon className="mx-auto mb-2 h-6 w-6 text-primary" />
              <p className="text-sm font-semibold">{t}</p>
              <p className="mt-1 text-xs text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>

        <Suspense fallback={<div className="mx-auto h-64 max-w-xl animate-pulse rounded-2xl bg-muted" />}>
          <VerificationForm />
        </Suspense>
      </section>
    </main>
  );
}
