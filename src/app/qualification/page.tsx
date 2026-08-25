import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { QualificationForm } from "./qualification-form";

export const metadata: Metadata = {
  title: "Être recontacté — OFManager",
  description:
    "Dites-nous en 60 secondes où vous en êtes : nous vous rappelons au créneau de votre choix, ou testez la démo immédiatement.",
};

export default function QualificationPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/"><Logo /></Link>
        <Link href="/demo" className="text-sm font-medium text-[#3B6EF5] hover:underline">
          Tester la démo →
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 pb-16">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          60 secondes, et on vous rappelle
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-600">
          Quelques questions pour préparer votre rappel — vous parlerez directement à quelqu'un
          qui connaît votre métier, pas à un script.
        </p>
        <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
          <QualificationForm />
        </div>
      </main>
    </div>
  );
}
