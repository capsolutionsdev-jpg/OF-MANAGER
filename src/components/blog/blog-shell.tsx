// src/components/blog/blog-shell.tsx
// Coquille partagée des articles de blog (Server Component — AUCUN "use client").
// Porte le chrome (header/footer), le fil d'Ariane, la FAQ, les sources, le maillage,
// le CTA, et injecte le JSON-LD Article + FAQPage + BreadcrumbList.
// Chaque page.tsx d'article ne contient plus que le CORPS (children) + ses faqs/sources.
//
// Discipline SEO/AEO :
//   - la FAQ passée en prop alimente À LA FOIS la FAQ visible ET le JSON-LD (jamais divergents),
//   - le corps ouvre chaque section par une réponse courte extractible (<AnswerBox/>),
//   - « mis à jour le … » visible = signal de fraîcheur.
import type { ReactNode } from "react";
import Link from "next/link";
import { safeJsonLd } from "@/lib/json-ld";
import { ArrowRight, Check } from "lucide-react";
import { SITE_URL } from "@/lib/site-url";
import { ScrollReveal } from "@/components/site/scroll-reveal";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import {
  type BlogMeta,
  BLOG_BASE,
  BLOG_CATEGORIES,
  relatedArticles,
  frDate,
} from "@/lib/blog/registry";

const NAVY = "#0D1B3E";
const BLUE = "#3B6EF5";

export type Faq = { q: string; a: string };
export type Source = { label: string; href: string };

/** Réponse courte en tête de section (40-60 mots) — le bloc que Google/les IA extraient. */
export function AnswerBox({ children }: { children: ReactNode }) {
  return (
    <div className="my-6 rounded-xl border-l-4 border-[#3B6EF5] bg-[#F5F8FD] p-5 text-[15px] leading-relaxed text-slate-700">
      {children}
    </div>
  );
}

/** Encadré « faits clés » — liste de faits réglementaires vérifiables (cochés). */
export function FactBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="my-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#3B6EF5]" style={{ fontFamily: "var(--font-sora)" }}>
        {title}
      </h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {items.map((t) => (
          <li key={t} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#12B886]" /> {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Encadré discret « avec OFManager » — le lien produit, clairement séparé du contenu neutre. */
export function Callout({ children }: { children: ReactNode }) {
  return (
    <aside className="my-7 rounded-2xl border border-[#E8A33D]/40 bg-[#FFF8EC] p-6 text-sm leading-relaxed text-slate-700">
      {children}
    </aside>
  );
}

export function BlogArticleShell({
  meta,
  faqs,
  sources,
  children,
}: {
  meta: BlogMeta;
  faqs: Faq[];
  sources: Source[];
  children: ReactNode;
}) {
  const base = SITE_URL;
  const url = `${base}${BLOG_BASE}/${meta.slug}`;
  const categoryLabel = BLOG_CATEGORIES[meta.category].label;
  const related = relatedArticles(meta.slug, 2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: base },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${base}${BLOG_BASE}` },
          { "@type": "ListItem", position: 3, name: meta.h1, item: url },
        ],
      },
      {
        "@type": "Article",
        headline: meta.h1,
        description: meta.description,
        datePublished: meta.datePublished,
        dateModified: meta.dateModified,
        inLanguage: "fr-FR",
        articleSection: categoryLabel,
        author: { "@type": "Organization", name: "La rédaction OFManager", url: base },
        publisher: { "@id": `${base}/#organization` },
        mainEntityOfPage: url,
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <ScrollReveal skip={1} />

      <SiteHeader />

      {/* ===== HERO ===== */}
      <section className="text-white" style={{ background: `radial-gradient(900px 500px at 80% -10%, rgba(59,110,245,.25), transparent 60%), linear-gradient(180deg, ${NAVY}, #12245A)` }}>
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <nav aria-label="Fil d'Ariane" className="mb-5 text-xs text-[#9fb4de]">
            <Link href="/" className="hover:text-white">Accueil</Link>
            <span className="mx-1.5">/</span>
            <Link href={BLOG_BASE} className="hover:text-white">Blog</Link>
            <span className="mx-1.5">/</span>
            <span className="text-[#cfe0ff]">{categoryLabel}</span>
          </nav>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-[#cfe0ff]">
            <span aria-hidden>{meta.emoji}</span> {categoryLabel}
          </span>
          <h1 className="mt-5 text-3xl font-extrabold leading-tight sm:text-4xl" style={{ fontFamily: "var(--font-sora)" }}>
            {meta.h1}
          </h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#9fb4de]">
            <span>Mis à jour le {frDate(meta.dateModified)}</span>
            <span aria-hidden>·</span>
            <span>{meta.readingMinutes} min de lecture</span>
            <span aria-hidden>·</span>
            <span>Par la rédaction OFManager</span>
          </p>
        </div>
      </section>

      {/* ===== CORPS ===== */}
      <article className="mx-auto max-w-3xl px-4 py-12 text-[15.5px] leading-7 text-slate-700 sm:px-6 [&_h2]:mt-11 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:text-[#0D1B3E] [&_h3]:mt-7 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-[#0D1B3E] [&_p]:mt-4 [&_a]:font-semibold [&_a]:text-[#3B6EF5] hover:[&_a]:underline [&_strong]:text-[#0D1B3E]">
        {children}
      </article>

      {/* ===== SOURCES OFFICIELLES ===== */}
      {sources.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FD] p-6">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500" style={{ fontFamily: "var(--font-sora)" }}>Sources officielles</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {sources.map((s) => (
                <li key={s.href}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-[#3B6EF5] hover:underline">{s.label} ↗</a>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-400">
              Contenu informatif tenu à jour au {frDate(meta.dateModified)}. La réglementation évolue : vérifiez toujours l&apos;information sur les sources officielles ci-dessus.
            </p>
          </div>
        </section>
      )}

      {/* ===== FAQ (identique au JSON-LD) ===== */}
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Questions fréquentes</h2>
        <div className="mt-8 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-[#0D1B3E]" style={{ fontFamily: "var(--font-sora)" }}>{f.q}</summary>
              <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ===== MAILLAGE : articles liés ===== */}
      {related.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
          <h2 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>À lire aussi</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {related.map((a) => (
              <Link key={a.slug} href={`${BLOG_BASE}/${a.slug}`} className="group rounded-2xl border border-slate-200 bg-white p-5 hover:border-[#3B6EF5]">
                <div className="text-2xl" aria-hidden>{a.emoji}</div>
                <h3 className="mt-2 font-bold text-[#0D1B3E] group-hover:text-[#3B6EF5]" style={{ fontFamily: "var(--font-sora)" }}>{a.h1}</h3>
                <p className="mt-1.5 text-sm text-slate-500">{a.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ===== CTA DÉMO ===== */}
      <section className="text-white" style={{ background: `linear-gradient(135deg, ${BLUE}, ${NAVY})` }}>
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <h2 className="text-2xl font-extrabold sm:text-3xl" style={{ fontFamily: "var(--font-sora)" }}>Un seul outil pour piloter votre organisme de formation</h2>
          <p className="mx-auto mt-3 max-w-lg text-[#dce7ff]">OFManager réunit inscriptions, sessions, Qualiopi, financement et facturation. Voyez-le fonctionner sur votre activité.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/demo" className="rounded-xl bg-white px-7 py-3 font-semibold text-[#0D1B3E] hover:bg-slate-100">Demander une démo <ArrowRight className="inline h-4 w-4" /></Link>
            <Link href="/fonctionnalites" className="rounded-xl border border-white/40 px-7 py-3 font-semibold hover:bg-white/10">Voir les fonctionnalités</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
