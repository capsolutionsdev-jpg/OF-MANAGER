import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "@/components/site/scroll-reveal";

export const metadata: Metadata = {
  title: "Partenaires & clients — OFManager",
  description: "Les organismes de formation et partenaires qui font confiance à OFManager.",
};

const NAVY = "#221F19";

export default function PartenairesPage() {
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

      <section className="text-center text-white" style={{ background: `radial-gradient(900px 500px at 80% -10%, #3A3550, transparent 60%), linear-gradient(180deg, ${NAVY}, #1B1825)` }}>
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-[#cfe0ff]">🤝 Ils nous font confiance</span>
          <h1 className="mt-5 text-4xl font-extrabold sm:text-5xl">Nos <span className="text-[#7B93E8]">partenaires</span> &amp; <span className="text-[#7B93E8]">clients</span></h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-[#bccbe9]">Les organismes de formation en sécurité, incendie et secourisme qui pilotent leur activité avec OFManager.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2C53C0]">Ils utilisent OFManager</p>
        <h2 className="mt-3 text-3xl font-extrabold">Nos clients organismes de formation</h2>
        <p className="mt-3 text-sm text-slate-500">Cette section sera complétée avec vos clients et leurs logos.</p>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {["Logo client", "Logo client", "Logo client", "Logo client", "Logo client", "Logo client", "Logo client", "+ le vôtre"].map((t, i) => (
            <div key={i} className="grid h-28 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-400">{t}</div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50/70 py-16">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2C53C0]">Écosystème</p>
          <h2 className="mt-3 text-3xl font-extrabold">Nos partenaires</h2>
          <div className="mt-10 grid gap-5 text-left sm:grid-cols-3">
            {[["🏛️", "Certificateurs", "INRS, France Compétences, organismes certificateurs des titres & certifications."], ["💶", "Financeurs & OPCO", "Partenaires du financement de la formation professionnelle."], ["🧩", "Partenaires technologiques", "Signature électronique, e-mailing, paiement, intégrations métier."]].map(([ic, t, d]) => (
              <div key={t} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-2xl">{ic}</div><h3 className="mt-3 font-bold text-[#221F19]">{t}</h3><p className="mt-1.5 text-sm text-slate-600">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-9 text-sm text-slate-400">Logos &amp; détails à intégrer ultérieurement.</p>
        </div>
      </section>

      <section className="text-white" style={{ background: `linear-gradient(135deg, #2C53C0, #2A2740)` }}>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold">Envie de rejoindre nos clients ?</h2>
          <p className="mx-auto mt-3 max-w-md text-[#dce7ff]">Découvrez OFManager sur vos formations de sécurité &amp; prévention.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/demo" className="rounded-xl bg-white px-7 py-3 font-semibold text-[#221F19] hover:bg-slate-100">Demander une démo</Link>
            <Link href="/" className="rounded-xl border border-white/40 px-7 py-3 font-semibold hover:bg-white/10">← Retour au site</Link>
          </div>
        </div>
      </section>

      <footer className="bg-[#221F19] py-8 text-center text-xs text-[#9fb0d0]">© 2026 OFManager — une solution <strong className="text-white">CAP Compétences</strong>.</footer>
    </main>
  );
}
