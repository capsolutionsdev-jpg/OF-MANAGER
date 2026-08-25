"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitDemoRequest, type DemoState } from "@/lib/actions/demo-actions";

const FORMATIONS = ["SST / MAC SST", "TFP APS / MAC APS", "SSIAP 1·2·3", "Habilitation électrique", "Prévention", "Autre"];

export function DemoForm() {
  const [state, action, pending] = useActionState<DemoState | undefined, FormData>(submitDemoRequest, undefined);

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-2xl text-emerald-600">✓</div>
        <h2 className="text-xl font-bold text-[#0D1B3E]">Demande envoyée, merci !</h2>
        <p className="mt-2 text-sm text-slate-600">
          Notre équipe vous recontacte sous 24 h pour une démonstration personnalisée sur vos formations.
        </p>
        {state.demo && (
          <p className="mt-3 text-xs text-amber-600">
            (Mode démo : configurez <code>DEMO_NOTIFY_EMAIL</code> + Brevo pour l'envoi réel.)
          </p>
        )}
        <Link href="/" className="mt-6 inline-flex rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-[#0D1B3E] hover:bg-slate-50">
          ← Retour au site
        </Link>
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
          <input id="telephone" name="telephone" className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#3B6EF5] focus:ring-2 focus:ring-[#3B6EF5]/20" placeholder="06 12 34 56 78" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="hebergement" className="text-sm font-medium text-[#0D1B3E]">Hébergement souhaité</label>
        <select id="hebergement" name="hebergement" defaultValue="" className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#3B6EF5]">
          <option value="">Sans préférence</option>
          <option value="Cloud OFManager">Cloud OFManager (hébergé chez vous)</option>
          <option value="Sur nos serveurs (interne)">Sur nos serveurs (interne)</option>
        </select>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-[#0D1B3E]">Formations concernées</legend>
        <div className="flex flex-wrap gap-2">
          {FORMATIONS.map((f) => (
            <label key={f} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm has-[:checked]:border-[#3B6EF5] has-[:checked]:bg-[#3B6EF5]/10 has-[:checked]:text-[#3B6EF5]">
              <input type="checkbox" name="formations" value={f} className="h-3.5 w-3.5" /> {f}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="message" className="text-sm font-medium text-[#0D1B3E]">Votre besoin</label>
        <textarea id="message" name="message" rows={4} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#3B6EF5] focus:ring-2 focus:ring-[#3B6EF5]/20" placeholder="Décrivez votre organisme et vos attentes…" />
      </div>

      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}

      <button type="submit" disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3B6EF5] px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-[#21429E] disabled:opacity-60 sm:w-auto">
        {pending ? "Envoi…" : "Envoyer ma demande de démo"}
      </button>
      <p className="text-xs text-slate-500">Réponse sous 24 h. Aucune carte bancaire, sans engagement.</p>
    </form>
  );
}
