// src/app/guides/page.tsx  (URL publique /guides — /blog est pris par le CMS interne)
// Index du blog OFManager. Server Component. Alimenté par le registre (source unique).
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SITE_URL } from "@/lib/site-url";
import { ScrollReveal } from "@/components/site/scroll-reveal";
import { BLOG_ARTICLES, BLOG_BASE, BLOG_CATEGORIES, frDate } from "@/lib/blog/registry";

const NAVY = "#0D1B3E";
const BLUE = "#3B6EF5";

export const metadata: Metadata = {
  title: "Blog OFManager — Qualiopi, création d'OF, financement",
  description:
    "Guides pratiques pour les organismes de formation : certification Qualiopi, création d'un OF, financement CPF/OPCO et réglementation sécurité & transport.",
  alternates: { canonical: BLOG_BASE },
  openGraph: {
    title: "Blog OFManager — guides pour organismes de formation",
    description:
      "Certification Qualiopi, création d'un organisme de formation, financement et réglementation métier. Des guides clairs et à jour.",
    url: BLOG_BASE,
  },
};

export default function Page() {
  const base = SITE_URL;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: base },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${base}${BLOG_BASE}` },
        ],
      },
      {
        "@type": "Blog",
        name: "Blog OFManager",
        description:
          "Guides pour organismes de formation : Qualiopi, création d'OF, financement et réglementation.",
        url: `${base}${BLOG_BASE}`,
        inLanguage: "fr-FR",
        publisher: { "@id": `${base}/#organization` },
        blogPost: BLOG_ARTICLES.map((a) => ({
          "@type": "BlogPosting",
          headline: a.h1,
          description: a.description,
          url: `${base}${BLOG_BASE}/${a.slug}`,
          datePublished: a.datePublished,
          dateModified: a.dateModified,
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-white text-[#0D1B3E]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ScrollReveal skip={1} />

      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Link href="/"><Image src="/ofmanager-logo.png" alt="OFManager" width={150} height={48} priority className="h-9 w-auto" /></Link>
          <Link href="/" className="ml-2 text-sm text-slate-500 hover:text-[#3B6EF5]">← Accueil</Link>
          <Link href="/demo" className="ml-auto rounded-lg bg-[#3B6EF5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2954D4]">Demander une démo</Link>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="text-white" style={{ background: `radial-gradient(900px 500px at 80% -10%, rgba(59,110,245,.25), transparent 60%), linear-gradient(180deg, ${NAVY}, #12245A)` }}>
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-[#cfe0ff]">📚 Le blog OFManager</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl" style={{ fontFamily: "var(--font-sora)" }}>
            Guides pour <span style={{ color: "#7FA3FF" }}>organismes de formation</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-[#bccbe9]">
            Certification Qualiopi, création d&apos;un OF, financement, réglementation métier : des guides clairs, à jour, et
            appuyés sur les sources officielles — pour lancer et piloter votre organisme sereinement.
          </p>
        </div>
      </section>

      {/* ===== LISTE DES ARTICLES ===== */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          {BLOG_ARTICLES.map((a) => (
            <Link
              key={a.slug}
              href={`${BLOG_BASE}/${a.slug}`}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-7 transition hover:-translate-y-0.5 hover:border-[#3B6EF5] hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden>{a.emoji}</span>
                <span className="rounded-full bg-[#3B6EF5]/10 px-3 py-1 text-xs font-semibold text-[#3B6EF5]">{BLOG_CATEGORIES[a.category].label}</span>
              </div>
              <h2 className="mt-4 text-xl font-extrabold leading-snug text-[#0D1B3E] group-hover:text-[#3B6EF5]" style={{ fontFamily: "var(--font-sora)" }}>
                {a.h1}
              </h2>
              <p className="mt-2.5 flex-1 text-sm leading-relaxed text-slate-600">{a.excerpt}</p>
              <div className="mt-5 flex items-center gap-3 text-xs text-slate-400">
                <span>Mis à jour le {frDate(a.dateModified)}</span>
                <span aria-hidden>·</span>
                <span>{a.readingMinutes} min</span>
                <span className="ml-auto font-semibold text-[#3B6EF5]">Lire <ArrowRight className="inline h-3.5 w-3.5" /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="text-white" style={{ background: `linear-gradient(135deg, ${BLUE}, ${NAVY})` }}>
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <h2 className="text-2xl font-extrabold sm:text-3xl" style={{ fontFamily: "var(--font-sora)" }}>Prêt à piloter votre organisme dans un seul outil ?</h2>
          <p className="mx-auto mt-3 max-w-lg text-[#dce7ff]">Inscriptions, sessions, Qualiopi, financement, facturation — réunis dans OFManager.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/demo" className="rounded-xl bg-white px-7 py-3 font-semibold text-[#0D1B3E] hover:bg-slate-100">Demander une démo <ArrowRight className="inline h-4 w-4" /></Link>
            <Link href="/fonctionnalites" className="rounded-xl border border-white/40 px-7 py-3 font-semibold hover:bg-white/10">Voir les fonctionnalités</Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#0D1B3E] py-8 text-center text-xs text-[#9fb0d0]">
        © 2026 OFManager — une solution <strong className="text-white">CAP SOLUTIONS</strong>. · <Link href="/mentions-legales" className="text-[#9fb0d0] hover:text-white">Mentions légales</Link>
      </footer>
    </main>
  );
}
