import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Mail, Phone, Clock } from "lucide-react";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact — OFManager",
  description: "Contactez l'équipe OFManager : une question, un projet pour votre organisme de formation ? On vous rappelle sous 24 h.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-[#0D1B3E]">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/"><Image src="/ofmanager-logo.png" alt="OFManager" width={150} height={48} priority className="h-10 w-auto" /></Link>
          <Link href="/" className="text-sm font-medium text-slate-500 hover:text-[#1A5FD4]">← Retour au site</Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#1A5FD4]/10 px-3 py-1 text-xs font-semibold text-[#1A5FD4]">On vous rappelle sous 24 h</span>
          <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl">Parlons de votre <span className="text-[#1A5FD4]">organisme</span></h1>
          <p className="mt-4 max-w-md text-slate-600">Une question, un projet, besoin d'un accompagnement ? Laissez-nous vos coordonnées — un conseiller OFManager vous recontacte rapidement.</p>
          <ul className="mt-7 space-y-3 text-sm text-slate-700">
            <li className="flex items-center gap-2.5"><Mail className="h-4 w-4 text-[#1A5FD4]" /> contact@ofmanager.fr</li>
            <li className="flex items-center gap-2.5"><Phone className="h-4 w-4 text-[#1A5FD4]" /> 01 23 45 67 89</li>
            <li className="flex items-center gap-2.5"><Clock className="h-4 w-4 text-[#1A5FD4]" /> Réponse sous 24 h ouvrées</li>
          </ul>
          <p className="mt-8 flex items-center gap-2 text-xs text-slate-400">
            <Image src="/ofmanager-logo.png" alt="" width={20} height={20} className="h-4 w-auto opacity-70" /> Une solution éditée par <span className="font-semibold text-slate-500">CAP Compétences</span>
          </p>
        </div>
        <ContactForm />
      </div>
    </main>
  );
}
