import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { DemoForm } from "./demo-form";

export const metadata: Metadata = {
  title: "Demander une démo — OFManager",
  description:
    "Demandez une démonstration personnalisée d'OFManager pour votre organisme de formation en sécurité, incendie et secourisme.",
};

const ARGS = [
  "Démonstration sur vos formations (SST, APS, SSIAP, habilitation…)",
  "Vos prérequis réglementaires (CNAPS, recyclages) en conditions réelles",
  "Conformité Qualiopi & préparation à l'audit",
  "Cloud ou installation sur vos serveurs",
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-[#221F19]">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/"><Image src="/ofmanager-logo.png" alt="OFManager" width={150} height={48} priority className="h-10 w-auto" /></Link>
          <Link href="/" className="text-sm font-medium text-slate-500 hover:text-[#2C53C0]">← Retour au site</Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#2C53C0]/10 px-3 py-1 text-xs font-semibold text-[#2C53C0]">
            Démo personnalisée · réponse sous 24 h
          </span>
          <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl">
            Voyez OFManager gérer <span className="text-[#2C53C0]">vos formations</span>
          </h1>
          <p className="mt-4 max-w-md text-slate-600">
            Dites-nous où vous en êtes : on vous montre la plateforme sur vos cas concrets
            (sécurité privée, incendie, secourisme, prévention).
          </p>
          <ul className="mt-7 space-y-3">
            {ARGS.map((a) => (
              <li key={a} className="flex items-start gap-2.5 text-sm text-slate-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {a}
              </li>
            ))}
          </ul>
          <p className="mt-8 flex items-center gap-2 text-xs text-slate-400">
            <Image src="/ofmanager-logo.png" alt="" width={20} height={20} className="h-4 w-auto opacity-70" />
            Une solution éditée par <span className="font-semibold text-slate-500">CAP SOLUTIONS</span>
          </p>
        </div>

        <DemoForm />
      </div>
    </main>
  );
}
