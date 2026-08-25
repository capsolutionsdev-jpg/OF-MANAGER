// src/app/glossaire/page.tsx
// Index du glossaire. Server Component. Schema DefinedTermSet + BreadcrumbList.
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SITE_URL } from "@/lib/site-url";
import { ScrollReveal } from "@/components/site/scroll-reveal";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { GLOSSAIRE, GLOSSAIRE_BASE, termsByCategory } from "@/lib/glossaire/terms";

const NAVY = "#0D1B3E";
const BLUE = "#3B6EF5";

export const metadata: Metadata = {
  title: "Glossaire de la formation professionnelle — OFManager",
  description:
    "Qualiopi, CPF, OPCO, NDA, BPF, CNAPS, TFP APS, SSIAP, T3P… Toutes les définitions clés de la formation professionnelle réglementée, expliquées simplement.",
  alternates: { canonical: GLOSSAIRE_BASE },
  openGraph: {
    title: "Glossaire de la formation professionnelle — OFManager",
    description:
      "Les définitions clés des OF réglementés : Qualiopi, financement, sécurité privée, transport VTC/Taxi.",
    url: GLOSSAIRE_BASE,
  },
};

export default function Page() {
  const base = SITE_URL;
  const groups = termsByCategory();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: base },
          { "@type": "ListItem", position: 2, name: "Glossaire", item: `${base}${GLOSSAIRE_BASE}` },
        ],
      },
      {
        "@type": "DefinedTermSet",
        name: "Glossaire de la formation professionnelle",
        description:
          "Définitions clés des organismes de formation réglementés : Qualiopi, financement, sécurité privée, transport.",
        url: `${base}${GLOSSAIRE_BASE}`,
        inLanguage: "fr-FR",
        hasDefinedTerm: GLOSSAIRE.map((t) => ({
          "@type": "DefinedTerm",
          name: `${t.term} — ${t.fullName}`,
          description: t.summary,
          url: `${base}${GLOSSAIRE_BASE}/${t.slug}`,
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-white text-[#0D1B3E]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ScrollReveal skip={1} />

      {/* ===== HEADER ===== */}
      <SiteHeader />

      {/* ===== HERO ===== */}
      <section className="text-white" style={{ background: `radial-gradient(900px 500px at 80% -10%, rgba(59,110,245,.25), transparent 60%), linear-gradient(180deg, ${NAVY}, #12245A)` }}>
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-[#cfe0ff]">📖 Glossaire</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl" style={{ fontFamily: "var(--font-sora)" }}>
            Le vocabulaire de la <span style={{ color: "#7FA3FF" }}>formation réglementée</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-[#bccbe9]">
            Qualiopi, CPF, NDA, CNAPS, T3P… Les sigles et notions clés des organismes de formation, définis simplement et
            reliés à nos guides et solutions.
          </p>
        </div>
      </section>

      {/* ===== TERMES PAR CATÉGORIE ===== */}
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        {groups.map((g) => (
          <section key={g.key} className="mb-12">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#3B6EF5]" style={{ fontFamily: "var(--font-sora)" }}>{g.label}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.terms.map((t) => (
                <Link
                  key={t.slug}
                  href={`${GLOSSAIRE_BASE}/${t.slug}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#3B6EF5] hover:shadow-md"
                >
                  <div className="font-extrabold text-[#0D1B3E] group-hover:text-[#3B6EF5]" style={{ fontFamily: "var(--font-sora)" }}>{t.term}</div>
                  <div className="mt-0.5 text-xs font-medium text-slate-400">{t.fullName}</div>
                  <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-slate-600">{t.summary}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* ===== CTA ===== */}
      <section className="text-white" style={{ background: `linear-gradient(135deg, ${BLUE}, ${NAVY})` }}>
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <h2 className="text-2xl font-extrabold sm:text-3xl" style={{ fontFamily: "var(--font-sora)" }}>Ces obligations, gérées pour vous</h2>
          <p className="mx-auto mt-3 max-w-lg text-[#dce7ff]">Qualiopi, financement, prérequis réglementaires : OFManager les intègre dans un seul outil.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/demo" className="rounded-xl bg-white px-7 py-3 font-semibold text-[#0D1B3E] hover:bg-slate-100">Demander une démo <ArrowRight className="inline h-4 w-4" /></Link>
            <Link href="/guides" className="rounded-xl border border-white/40 px-7 py-3 font-semibold hover:bg-white/10">Lire les guides</Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <SiteFooter />
    </main>
  );
}
