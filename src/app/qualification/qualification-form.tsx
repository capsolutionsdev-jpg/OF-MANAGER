"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2, PhoneCall } from "lucide-react";
import { submitQualification } from "@/lib/actions/demo-actions";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#2C53C0] focus:ring-2 focus:ring-[#2C53C0]/20";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

export function QualificationForm() {
  const [state, action, pending] = useActionState(submitQualification, undefined);

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h2 className="mt-3 text-lg font-bold text-slate-900">C'est noté, merci !</h2>
        <p className="mt-1 text-sm text-slate-600">
          Un conseiller OFManager vous rappelle au créneau indiqué. En attendant, vous pouvez déjà{" "}
          <a href="/demo" className="font-semibold text-[#2C53C0] underline">tester une démo</a>.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="q-nom">Votre nom *</label>
          <input id="q-nom" name="nom" required className={field} placeholder="Prénom NOM" />
        </div>
        <div>
          <label className={labelCls} htmlFor="q-org">Votre organisme</label>
          <input id="q-org" name="organisme" className={field} placeholder="Nom du centre" />
        </div>
        <div>
          <label className={labelCls} htmlFor="q-email">E-mail *</label>
          <input id="q-email" name="email" type="email" required autoComplete="email" className={field} placeholder="vous@of.fr" />
        </div>
        <div>
          <label className={labelCls} htmlFor="q-tel">Téléphone</label>
          <input id="q-tel" name="telephone" type="tel" className={field} placeholder="06 12 34 56 78" />
        </div>
        <div>
          <label className={labelCls} htmlFor="q-vert">Votre métier</label>
          <select id="q-vert" name="verticale" defaultValue="" className={field}>
            <option value="">—</option>
            <option value="securite">Sécurité privée</option>
            <option value="transport">Transport (Taxi / VTC)</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="q-outil">Avez-vous déjà un outil de gestion ?</label>
          <select id="q-outil" name="outilActuel" defaultValue="" className={field}>
            <option value="">—</option>
            <option value="aucun">Aucun / papier</option>
            <option value="excel">Excel</option>
            <option value="concurrent">Un logiciel concurrent</option>
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="q-vol">Stagiaires par mois (env.)</label>
          <input id="q-vol" name="volume" type="number" min="0" className={field} placeholder="Ex. 300" />
        </div>
        <div>
          <label className={labelCls} htmlFor="q-qualiopi">Prochain audit Qualiopi</label>
          <select id="q-qualiopi" name="echeanceQualiopi" defaultValue="" className={field}>
            <option value="">—</option>
            <option value="moins_6_mois">Dans moins de 6 mois</option>
            <option value="plus_6_mois">Dans plus de 6 mois</option>
            <option value="non_concerne">Non concerné</option>
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="q-remplit">Vos sessions</label>
          <select id="q-remplit" name="remplit" defaultValue="" className={field}>
            <option value="">—</option>
            <option value="oui">J'ai du mal à les remplir</option>
            <option value="non">Mon carnet est plein</option>
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="q-rappel">Quand vous rappeler ?</label>
          <input id="q-rappel" name="rappel" className={field} placeholder="Ex. cette semaine, le matin" />
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="q-msg">Un mot (optionnel)</label>
        <textarea id="q-msg" name="message" rows={2} className={field} placeholder="Votre besoin en une phrase…" />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2C53C0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24469f] disabled:opacity-60 sm:w-auto"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
        Être recontacté
      </button>
      <p className="text-xs text-slate-500">Sans engagement. Vos données ne servent qu'à vous recontacter (RGPD).</p>
    </form>
  );
}
