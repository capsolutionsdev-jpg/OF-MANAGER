"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitContact, type DemoState } from "@/lib/actions/demo-actions";

export function ContactForm() {
  const [state, action, pending] = useActionState<DemoState | undefined, FormData>(submitContact, undefined);

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-2xl text-emerald-600">✓</div>
        <h2 className="text-xl font-bold text-[#0D1B3E]">Message bien reçu !</h2>
        <p className="mt-2 text-sm text-slate-600">Notre équipe vous rappelle très vite. Merci de votre intérêt pour OFManager.</p>
        <Link href="/" className="mt-6 inline-flex rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-[#0D1B3E] hover:bg-slate-50">← Retour au site</Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="nom" className="text-sm font-medium text-[#0D1B3E]">Nom *</label>
          <input id="nom" name="nom" required className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#3B6EF5] focus:ring-2 focus:ring-[#3B6EF5]/20" placeholder="Prénom NOM" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="organisme" className="text-sm font-medium text-[#0D1B3E]">Organisme</label>
          <input id="organisme" name="organisme" className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#3B6EF5] focus:ring-2 focus:ring-[#3B6EF5]/20" placeholder="Nom de votre OF" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-[#0D1B3E]">E-mail *</label>
          <input id="email" name="email" type="email" required className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#3B6EF5] focus:ring-2 focus:ring-[#3B6EF5]/20" placeholder="vous@of.fr" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="telephone" className="text-sm font-medium text-[#0D1B3E]">Téléphone</label>
          <input id="telephone" name="telephone" type="tel" inputMode="tel" className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#3B6EF5] focus:ring-2 focus:ring-[#3B6EF5]/20" placeholder="06 12 34 56 78" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="message" className="text-sm font-medium text-[#0D1B3E]">Votre message</label>
        <textarea id="message" name="message" rows={4} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#3B6EF5] focus:ring-2 focus:ring-[#3B6EF5]/20" placeholder="Une question, un projet ? Écrivez-nous, on vous rappelle." />
      </div>
      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <button type="submit" disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3B6EF5] px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-[#21429E] disabled:opacity-60 sm:w-auto">
        {pending ? "Envoi…" : "Être rappelé(e)"}
      </button>
      <p className="text-xs text-slate-500">On vous recontacte sous 24 h. Sans engagement.</p>
    </form>
  );
}
