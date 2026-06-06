import type { Metadata } from "next";
import Image from "next/image";
import { ShieldCheck, FileSignature, GraduationCap } from "lucide-react";
import { LoginForm } from "./login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Connexion — CAP Compétence Manager",
};

const points = [
  {
    icon: GraduationCap,
    title: "Gestion complète",
    desc: "Candidats, sessions, formations et émargements au même endroit.",
  },
  {
    icon: FileSignature,
    title: "Documents & signatures",
    desc: "Conventions, convocations et attestations signées en PDF.",
  },
  {
    icon: ShieldCheck,
    title: "Conforme Qualiopi",
    desc: "Suivi des indicateurs et traçabilité de bout en bout.",
  },
];

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Panneau de marque (navy) — visible en grand écran */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0e1c3f] p-10 text-white lg:flex">
        {/* halos décoratifs */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#1A5FD4]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-[#4D9FFF]/20 blur-3xl" />

        <div className="relative z-10">
          <span className="inline-flex items-center rounded-lg bg-white px-3 py-2 shadow-sm">
            <Image
              src="/cap-competences-logo.png"
              alt="CAP Compétences"
              width={180}
              height={56}
              priority
              className="h-9 w-auto"
            />
          </span>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Pilotez votre organisme de formation, simplement.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            Le back-office tout-en-un de CAP Compétences : prospection,
            inscriptions, sessions, e-learning et conformité.
          </p>

          <ul className="mt-8 space-y-4">
            {points.map((p) => (
              <li key={p.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <p.icon className="h-5 w-5 text-[#4D9FFF]" />
                </span>
                <div>
                  <div className="text-sm font-semibold">{p.title}</div>
                  <div className="text-xs text-white/60">{p.desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} CAP Compétences — Tous droits réservés.
        </p>
      </div>

      {/* Formulaire */}
      <div className="flex items-center justify-center bg-muted/40 p-4 sm:p-8">
        <div className="w-full max-w-sm">
          {/* Logo (mobile uniquement) */}
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <div className="relative mb-3 h-14 w-56">
              <Image
                src="/cap-competences-logo.png"
                alt="CAP Compétences"
                fill
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-lg font-bold">Compétence Manager</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Connexion</CardTitle>
              <CardDescription>
                Accédez à votre espace avec vos identifiants.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
