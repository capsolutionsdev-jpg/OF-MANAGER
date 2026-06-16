import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  ArrowRight,
  Users,
  CalendarCheck,
  FileSignature,
  ShieldCheck,
  GraduationCap,
  Wallet,
  Sparkles,
  Palette,
  BarChart3,
  Bell,
  Check,
} from "lucide-react";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "OFManager — Le logiciel tout-en-un des organismes de formation",
  description:
    "OFManager pilote votre organisme de formation : prospection, inscriptions, sessions, documents, e-learning, facturation et conformité Qualiopi — automatisé et à votre image.",
};

const NAVY = "#0D1B3E";

const features = [
  { icon: Users, title: "CRM & prospects", desc: "Pipeline commercial, relances, sources d'acquisition et scoring." },
  { icon: CalendarCheck, title: "Sessions & émargement", desc: "Planification, émargement signé en ligne, suivi des présences." },
  { icon: FileSignature, title: "Documents & signatures", desc: "Conventions, convocations, attestations générées et signées." },
  { icon: ShieldCheck, title: "Qualiopi & BPF", desc: "Indicateurs, preuves et BPF générés à partir de vos données réelles." },
  { icon: GraduationCap, title: "E-learning intégré", desc: "Cours, modules, quiz et suivi de la progression des apprenants." },
  { icon: Wallet, title: "Devis & comptabilité", desc: "Devis, financements (CPF, OPCO…), règlements et impayés sous contrôle." },
  { icon: Bell, title: "Automatisations", desc: "Convocations, attestations et relances envoyées toutes seules." },
  { icon: Sparkles, title: "Assistant IA", desc: "Rédaction de relances, qualification des prospects, résumés." },
];

export default async function HomePage() {
  // Utilisateur connecté → on l'envoie directement vers son espace.
  const session = await auth();
  if (session?.user) {
    redirect((session.user.role as Role) === "SUPERADMIN" ? "/console" : "/dashboard");
  }

  return (
    <main className="min-h-screen bg-white text-[#0D1B3E]">
      {/* Barre de navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Image src="/ofmanager-logo.png" alt="OFManager" width={150} height={48} priority className="h-10 w-auto" />
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-[#1A5FD4] hover:bg-[#1A5FD4]/10"
            >
              Se connecter
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A5FD4] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1750b5]"
            >
              Accéder à mon espace <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 0%, rgba(26,95,212,0.10), transparent 70%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-14 text-center sm:px-6 sm:pt-20">
          <Image
            src="/ofmanager-logo.png"
            alt="OFManager"
            width={420}
            height={336}
            priority
            className="mx-auto h-40 w-auto sm:h-52"
          />
          <h1 className="mx-auto mt-6 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Le logiciel tout-en-un des{" "}
            <span className="text-[#1A5FD4]">organismes de formation</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
            De la prospection à la facturation : OFManager centralise, automatise et sécurise
            toute la gestion de votre OF — conforme Qualiopi, à vos couleurs.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A5FD4] px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-[#1750b5] sm:w-auto"
            >
              Se connecter <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#fonctionnalites"
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-6 py-3 text-base font-semibold text-[#0D1B3E] transition hover:bg-slate-50 sm:w-auto"
            >
              Découvrir les fonctionnalités
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            {["Conforme Qualiopi", "BPF automatisé", "Données isolées par OF", "Hébergé en UE"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-500" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section id="fonctionnalites" className="border-t border-slate-100 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Tout votre organisme, au même endroit</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            Une donnée saisie une seule fois alimente vos documents, vos e-mails, vos statistiques et votre BPF.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1A5FD4]/10 text-[#1A5FD4]">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Personnalisation / multi-tenant */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div
          className="grid items-center gap-8 rounded-3xl p-8 text-white sm:p-12 lg:grid-cols-2"
          style={{ background: `linear-gradient(135deg, ${NAVY}, #1A5FD4)` }}
        >
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Votre plateforme, à votre image</h2>
            <p className="mt-3 text-white/80">
              Logo, couleurs, documents et sous-domaine : chaque organisme dispose d'un espace
              isolé et personnalisé. Choisissez parmi plusieurs designs et déclinez-les en plusieurs couleurs.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {[
                "8 styles d'interface × plusieurs palettes de couleur",
                "Comptes & droits par rôle (gérant, assistant, formateur…)",
                "Documents conformes générés automatiquement",
                "Espace client entreprise (B2B) en self-service",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#7fd4ff]" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center justify-center gap-6">
            <Palette className="h-14 w-14 text-white/70" />
            <BarChart3 className="h-20 w-20 text-white/90" />
            <ShieldCheck className="h-14 w-14 text-white/70" />
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-slate-100">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">Prêt à gagner du temps ?</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Récupérez l'équivalent d'1 à 2 jours par semaine sur l'administratif.
          </p>
          <Link
            href="/login"
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1A5FD4] px-7 py-3 text-base font-semibold text-white shadow-md transition hover:bg-[#1750b5]"
          >
            Accéder à mon espace <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Pied de page */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <Image src="/ofmanager-logo.png" alt="OFManager" width={120} height={38} className="h-8 w-auto" />
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} OFManager — Logiciel de gestion pour organismes de formation.
          </p>
          <Link href="/login" className="text-sm font-medium text-[#1A5FD4] hover:underline">
            Se connecter →
          </Link>
        </div>
      </footer>
    </main>
  );
}
