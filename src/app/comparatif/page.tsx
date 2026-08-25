// src/app/comparatif/page.tsx
// Comparatif de CATÉGORIE (sans nommer de concurrent) : logiciel spécialisé réglementé
// vs plateforme généraliste. Positionnement honnête, zéro risque juridique.
// (Les pages nommées « vs X » vivent sur la branche feat/comparatifs, non publiées.)
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { SITE_URL } from "@/lib/site-url";
import { ScrollReveal } from "@/components/site/scroll-reveal";

const NAVY = "#0D1B3E";
const BLUE = "#3B6EF5";

export const metadata: Metadata = {
  title: "Logiciel OF spécialisé ou généraliste : comparatif",
  description:
    "Logiciel spécialisé pour organismes réglementés (sécurité, VTC/Taxi) ou plateforme généraliste ? Le comparatif pour choisir le bon logiciel de gestion d'OF.",
  alternates: { canonical: "/comparatif" },
  openGraph: {
    title: "Logiciel OF spécialisé ou généraliste : comparatif",
    description: "Spécialiste réglementé vs plateforme généraliste : lequel pour votre organisme de formation ?",
    url: "/comparatif",
  },
};

// Lignes du tableau. `spec`=avantage spécialiste, `parite`=équivalent, `gen`=avantage généraliste.
const ROWS: { dim: string; ofm: string; gen: string; verdict: "spec" | "parite" | "gen" }[] = [
  { dim: "Positionnement", ofm: "Spécialiste des OF réglementés (sécurité, VTC/Taxi)", gen: "Tous domaines de formation", verdict: "spec" },
  { dim: "Formations métier préconfigurées (TFP APS, SSIAP, T3P…)", ofm: "Prêtes à l'emploi, prérequis inclus", gen: "À paramétrer selon votre activité", verdict: "spec" },
  { dim: "Suivi des prérequis réglementaires (CNAPS, T3P…)", ofm: "Natif", gen: "À construire soi-même", verdict: "spec" },
  { dim: "Vérification anti-fraude des titres", ofm: "Oui — numéro + QR vérifiable", gen: "Généralement absent", verdict: "spec" },
  { dim: "Qualiopi, e-learning, signature, CRM, facturation", ofm: "Oui", gen: "Oui, le plus souvent", verdict: "parite" },
  { dim: "Couverture multi-domaines (langues, bureautique…)", ofm: "Centré sécurité & transport", gen: "Large, tous secteurs", verdict: "gen" },
  { dim: "Tarification", ofm: "Publique et transparente", gen: "Souvent sur devis", verdict: "spec" },
];

function Verdict({ v }: { v: "spec" | "parite" | "gen" }) {
  if (v === "spec") return <span className="inline-flex items-center gap-1 rounded-full bg-[#12B886]/12 px-2 py-0.5 text-[11px] font-bold text-[#0E9E73]"><Check className="h-3 w-3" /> Spécialiste</span>;
  if (v === "gen") return <span className="inline-flex items-center gap-1 rounded-full bg-[#E8A33D]/15 px-2 py-0.5 text-[11px] font-bold text-[#B9791B]">Généraliste</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500"><Minus className="h-3 w-3" /> Parité</span>;
}

const faqs = [
  {
    q: "Faut-il un logiciel spécialisé ou une plateforme généraliste pour un organisme de formation ?",
    a: "Cela dépend de votre activité. Si vous formez sur des métiers réglementés (sécurité privée, VTC/Taxi), un logiciel spécialisé comme OFManager arrive avec vos formations, prérequis et obligations déjà prêts. Si vous couvrez de nombreux domaines sans contrainte réglementaire forte, une plateforme généraliste peut suffire.",
  },
  {
    q: "Qu'apporte un logiciel spécialisé qu'un généraliste n'a pas ?",
    a: "Les formations réglementées préconfigurées (TFP APS, SSIAP, T3P…), le suivi natif des prérequis (CNAPS, aptitudes, cartes professionnelles), les recyclages obligatoires, et la vérification anti-fraude des titres délivrés — des éléments qu'une plateforme généraliste laisse à votre charge.",
  },
];

export default function Page() {
  const base = SITE_URL;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: base },
          { "@type": "ListItem", position: 2, name: "Comparatif", item: `${base}/comparatif` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-white text-[#0D1B3E]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ScrollReveal skip={1} />

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-4 px-4 sm:px-6">
          <Link href="/"><Image src="/ofmanager-logo.png" alt="OFManager" width={150} height={48} priority className="h-9 w-auto" /></Link>
          <Link href="/" className="ml-2 text-sm text-slate-500 hover:text-[#3B6EF5]">← Accueil</Link>
          <Link href="/demo" className="ml-auto rounded-lg bg-[#3B6EF5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2954D4]">Demander une démo</Link>
        </div>
      </header>

      {/* HERO */}
      <section className="text-white" style={{ background: `radial-gradient(900px 500px at 80% -10%, rgba(59,110,245,.25), transparent 60%), linear-gradient(180deg, ${NAVY}, #12245A)` }}>
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-[#cfe0ff]">⚖️ Comparatif</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl" style={{ fontFamily: "var(--font-sora)" }}>
            Logiciel <span style={{ color: "#7FA3FF" }}>spécialisé</span> ou plateforme généraliste ?
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-[#bccbe9]">
            Les deux gèrent inscriptions, Qualiopi et facturation. La vraie question : vos formations réglementées sont-elles
            <strong className="text-white"> déjà prêtes</strong>, ou faut-il tout paramétrer&nbsp;?
          </p>
        </div>
      </section>

      {/* TABLE */}
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Le comparatif, point par point</h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="py-3 pr-4"></th>
                <th className="py-3 pr-4 font-bold text-[#3B6EF5]" style={{ fontFamily: "var(--font-sora)" }}>OFManager (spécialiste)</th>
                <th className="py-3 pr-4 font-bold text-[#0D1B3E]" style={{ fontFamily: "var(--font-sora)" }}>Plateforme généraliste</th>
                <th className="py-3"></th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.dim} className="border-b border-slate-100 align-top">
                  <td className="py-3 pr-4 font-semibold text-[#0D1B3E]">{r.dim}</td>
                  <td className="py-3 pr-4 text-slate-700">{r.ofm}</td>
                  <td className="py-3 pr-4 text-slate-600">{r.gen}</td>
                  <td className="py-3 whitespace-nowrap"><Verdict v={r.verdict} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* QUAND CHOISIR QUOI */}
      <section className="bg-[#F5F8FD] py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl p-7 text-white" style={{ background: `linear-gradient(180deg, ${NAVY}, #12245A)` }}>
              <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-sora)" }}>Choisissez un spécialiste si…</h2>
              <ul className="mt-4 space-y-2 text-sm text-[#dfe6f6]">
                {[
                  "Votre cœur de métier est la sécurité privée ou le transport (VTC/Taxi)",
                  "Vous voulez vos formations et prérequis réglementaires déjà prêts",
                  "Vous devez suivre cartes pro, aptitudes, recyclages obligatoires",
                  "L'authenticité de vos titres est un enjeu (anti-fraude)",
                ].map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#12B886]" /> {t}</li>)}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-7">
              <h2 className="text-xl font-bold text-[#0D1B3E]" style={{ fontFamily: "var(--font-sora)" }}>Un généraliste peut suffire si…</h2>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {[
                  "Vous formez sur de nombreux domaines très variés",
                  "Vos formations sont peu ou pas réglementées",
                  "Vous n'avez pas de prérequis métier lourds à tracer",
                  "La breadth du catalogue prime sur la spécialisation",
                ].map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#3B6EF5]" /> {t}</li>)}
              </ul>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">Honnêtement : les deux approches sont valables. Tout dépend de votre métier.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Questions fréquentes</h2>
        <div className="mt-8 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-[#0D1B3E]" style={{ fontFamily: "var(--font-sora)" }}>{f.q}</summary>
              <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-white" style={{ background: `linear-gradient(135deg, ${BLUE}, ${NAVY})` }}>
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <h2 className="text-2xl font-extrabold sm:text-3xl" style={{ fontFamily: "var(--font-sora)" }}>Le plus simple : voir OFManager sur votre métier</h2>
          <p className="mx-auto mt-3 max-w-lg text-[#dce7ff]">Une démo sur vos formations réglementées vaut mieux que n&apos;importe quel tableau.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/demo" className="rounded-xl bg-white px-7 py-3 font-semibold text-[#0D1B3E] hover:bg-slate-100">Demander une démo <ArrowRight className="inline h-4 w-4" /></Link>
            <Link href="/anti-fraude" className="rounded-xl border border-white/40 px-7 py-3 font-semibold hover:bg-white/10">Découvrir l&apos;anti-fraude</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0D1B3E] py-8 text-center text-xs text-[#9fb0d0]">
        © 2026 OFManager — une solution <strong className="text-white">CAP SOLUTIONS</strong>. · <Link href="/fonctionnalites" className="text-[#9fb0d0] hover:text-white">Fonctionnalités</Link> · <Link href="/guides" className="text-[#9fb0d0] hover:text-white">Blog</Link>
      </footer>
    </main>
  );
}
