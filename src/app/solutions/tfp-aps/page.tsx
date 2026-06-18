import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { ScrollReveal } from "@/components/site/scroll-reveal";

export const metadata: Metadata = {
  title: "TFP APS sur OFManager — du CNAPS à la certification",
  description:
    "Gérez le TFP APS de bout en bout avec OFManager : autorisation préalable CNAPS, dossier réglementaire, convocation d'examen, certification. Pour les organismes de sécurité privée.",
};

const NAVY = "#221F19";

const steps = [
  { n: 1, t: "Prospect & autorisation préalable CNAPS", d: "Dès l'étape prospect, vous suivez l'autorisation préalable obligatoire du CNAPS pour chaque candidat — impossible de lancer la formation sans elle.", chips: ["Non fait", "Demande en cours", "Complètement dossier", "Accepté", "Refusé"] },
  { n: 2, t: "Inscription & dossier réglementaire", d: "À l'inscription, la checklist du dossier se génère automatiquement. Vous cochez les pièces reçues et relancez en un clic celles qui manquent.", chips: ["Pièce d'identité", "Autorisation CNAPS", "2 photos (fond gris)", "Justif. domicile", "Casier judiciaire", "Niveau B1 (étrangers)"] },
  { n: 3, t: "Formation & émargement", d: "Sessions, formateurs, planning, émargement signé (présentiel & distanciel) et suivi pédagogique — toutes les preuves sont collectées pour l'audit.", chips: ["Émargement eIDAS", "Convention", "Suivi pédagogique"] },
  { n: 4, t: "Examen : convocation, date & lieu", d: "Le TFP APS étant soumis à examen, la convocation est générée automatiquement avec la date et le lieu (votre OF ou un autre centre).", chips: ["Convocation PDF", "Date d'examen", "Centre d'examen"] },
  { n: 5, t: "Certification & résultats", d: "Résultats consignés, attestations et documents de fin générés à votre charte. Les données alimentent votre BPF et votre dossier Qualiopi.", chips: ["Attestation", "Résultat certif.", "Alimente le BPF"] },
];

export default function TfpApsPage() {
  return (
    <main className="min-h-screen bg-white text-[#221F19]">
      <ScrollReveal skip={1} />
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Link href="/"><Image src="/ofmanager-logo.png" alt="OFManager" width={150} height={48} priority className="h-9 w-auto" /></Link>
          <Link href="/" className="ml-2 text-sm text-slate-500 hover:text-[#2C53C0]">← Retour</Link>
          <Link href="/demo" className="ml-auto rounded-lg bg-[#2C53C0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#21429E]">Demander une démo</Link>
        </div>
      </header>

      <section className="text-white" style={{ background: `radial-gradient(900px 500px at 80% -10%, #3A3550, transparent 60%), linear-gradient(180deg, ${NAVY}, #1B1825)` }}>
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-[#cfe0ff]">🛡️ Sécurité privée · Formation réglementée</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">TFP APS : du <span className="text-[#7B93E8]">CNAPS</span> à la <span className="text-[#7B93E8]">certification</span>, géré de bout en bout</h1>
          <p className="mt-5 max-w-2xl text-lg text-[#bccbe9]">Autorisation préalable, dossier strict, examen : OFManager pilote chaque exigence du TFP APS pour vous, sans rien oublier.</p>
          <div className="mt-7 flex flex-wrap gap-x-7 gap-y-2 text-sm text-[#cdd8f0]">
            <span><b className="text-white">175 h</b> de formation</span><span><b className="text-white">Examen</b> + jury</span><span><b className="text-white">Autorisation CNAPS</b> requise</span><span><b className="text-white">RNCP</b> · France Compétences</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-extrabold">Chaque exigence du TFP APS, automatisée</h2>
        <div className="mt-12 space-y-5">
          {steps.map((s, i) => (
            <div key={s.n} className="relative grid grid-cols-[56px_1fr] gap-5">
              {i < steps.length - 1 && <span className="absolute left-[27px] top-14 bottom-0 w-0.5 bg-slate-200" />}
              <div className="z-10 grid h-12 w-12 place-items-center rounded-2xl text-lg font-extrabold text-white" style={{ background: s.n === 1 ? "#2C53C0" : NAVY }}>{s.n}</div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-[#221F19]">{s.t}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{s.d}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.chips.map((c) => <span key={c} className="rounded-full bg-[#2C53C0]/10 px-3 py-1 text-xs font-semibold text-[#2C53C0]">{c}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50/70 py-16">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:px-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-7">
            <h3 className="font-bold text-[#221F19]">🗂️ Le dossier réglementaire, sous contrôle</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-700">{["Checklist auto-générée par formation", "Suivi pièce par pièce, par candidat", "Relance e-mail des pièces manquantes", "Blocage tant que l'autorisation CNAPS n'est pas accordée"].map((t) => <li key={t} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-500" /> {t}</li>)}</ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-7">
            <h3 className="font-bold text-[#221F19]">🛡️ La conformité, en continu</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-700">{["Preuves rattachées aux indicateurs Qualiopi", "Émargements horodatés à valeur légale", "BPF pré-rempli automatiquement", "Dossier d'audit exportable en 1 clic"].map((t) => <li key={t} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-500" /> {t}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="text-white" style={{ background: `linear-gradient(135deg, #2C53C0, #2A2740)` }}>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold">Voyez OFManager gérer un TFP APS en direct</h2>
          <p className="mx-auto mt-3 max-w-md text-[#dce7ff]">Démonstration personnalisée sur vos formations de sécurité privée.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/demo" className="rounded-xl bg-white px-7 py-3 font-semibold text-[#221F19] hover:bg-slate-100">Demander une démo <ArrowRight className="inline h-4 w-4" /></Link>
            <Link href="/" className="rounded-xl border border-white/40 px-7 py-3 font-semibold hover:bg-white/10">← Retour au site</Link>
          </div>
        </div>
      </section>

      <footer className="bg-[#221F19] py-8 text-center text-xs text-[#9fb0d0]">© 2026 OFManager — une solution <strong className="text-white">CAP Compétences</strong>.</footer>
    </main>
  );
}
