// src/app/glossaire/[terme]/page.tsx
// Page de terme du glossaire (route dynamique statique). Server Component.
// Schema DefinedTerm + BreadcrumbList. Réponse extractible (summary) en tête.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { SITE_URL } from "@/lib/site-url";
import { ScrollReveal } from "@/components/site/scroll-reveal";
import { GLOSSAIRE, GLOSSAIRE_BASE, GLOSSAIRE_CATEGORIES, getTerm } from "@/lib/glossaire/terms";
import { getArticle, BLOG_BASE } from "@/lib/blog/registry";

const NAVY = "#0D1B3E";
const BLUE = "#3B6EF5";

export const dynamicParams = false; // seules les slugs connues → 404 sinon

export function generateStaticParams() {
  return GLOSSAIRE.map((t) => ({ terme: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ terme: string }> }): Promise<Metadata> {
  const { terme } = await params;
  const t = getTerm(terme);
  if (!t) return {};
  const withFull = `${t.term} (${t.fullName}) : définition`;
  const title = withFull.length <= 60 ? withFull : `${t.term} : définition`;
  return {
    title,
    description: t.summary,
    alternates: { canonical: `${GLOSSAIRE_BASE}/${t.slug}` },
    openGraph: { title, description: t.summary, url: `${GLOSSAIRE_BASE}/${t.slug}`, type: "article" },
  };
}

export default async function Page({ params }: { params: Promise<{ terme: string }> }) {
  const { terme } = await params;
  const t = getTerm(terme);
  if (!t) notFound();

  const base = SITE_URL;
  const url = `${base}${GLOSSAIRE_BASE}/${t.slug}`;
  const categoryLabel = GLOSSAIRE_CATEGORIES[t.category].label;
  const seeAlso = (t.seeAlso ?? []).map(getTerm).filter((x): x is NonNullable<typeof x> => Boolean(x));
  const guides = (t.relatedGuides ?? []).map((slug) => getArticle(slug)).filter((x): x is NonNullable<typeof x> => Boolean(x));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: base },
          { "@type": "ListItem", position: 2, name: "Glossaire", item: `${base}${GLOSSAIRE_BASE}` },
          { "@type": "ListItem", position: 3, name: t.term, item: url },
        ],
      },
      {
        "@type": "DefinedTerm",
        "@id": `${url}#term`,
        name: `${t.term} — ${t.fullName}`,
        description: t.summary,
        inDefinedTermSet: `${base}${GLOSSAIRE_BASE}`,
        url,
        inLanguage: "fr-FR",
      },
    ],
  };

  return (
    <main className="min-h-screen bg-white text-[#0D1B3E]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ScrollReveal skip={1} />

      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-4 px-4 sm:px-6">
          <Link href="/"><Image src="/ofmanager-logo.png" alt="OFManager" width={150} height={48} priority className="h-9 w-auto" /></Link>
          <Link href={GLOSSAIRE_BASE} className="ml-2 text-sm text-slate-500 hover:text-[#3B6EF5]">← Glossaire</Link>
          <Link href="/demo" className="ml-auto rounded-lg bg-[#3B6EF5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2954D4]">Demander une démo</Link>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="text-white" style={{ background: `radial-gradient(900px 500px at 80% -10%, rgba(59,110,245,.25), transparent 60%), linear-gradient(180deg, ${NAVY}, #12245A)` }}>
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <nav aria-label="Fil d'Ariane" className="mb-5 text-xs text-[#9fb4de]">
            <Link href="/" className="hover:text-white">Accueil</Link>
            <span className="mx-1.5">/</span>
            <Link href={GLOSSAIRE_BASE} className="hover:text-white">Glossaire</Link>
            <span className="mx-1.5">/</span>
            <span className="text-[#cfe0ff]">{t.term}</span>
          </nav>
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-[#cfe0ff]">{categoryLabel}</span>
          <h1 className="mt-5 text-3xl font-extrabold leading-tight sm:text-4xl" style={{ fontFamily: "var(--font-sora)" }}>
            {t.term} <span className="text-[#7FA3FF]">— {t.fullName}</span>
          </h1>
        </div>
      </section>

      {/* ===== DÉFINITION (réponse extractible) ===== */}
      <article className="mx-auto max-w-3xl px-4 py-12 text-[15.5px] leading-7 text-slate-700 sm:px-6">
        <div className="rounded-xl border-l-4 border-[#3B6EF5] bg-[#F5F8FD] p-5 text-[16px] font-medium leading-relaxed text-[#0D1B3E]">
          <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-[#3B6EF5]">Définition</span>
          {t.summary}
        </div>
        {t.details.map((p) => (
          <p key={p} className="mt-4">{p}</p>
        ))}

        {/* Guides liés */}
        {guides.length > 0 && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500" style={{ fontFamily: "var(--font-sora)" }}>Pour aller plus loin</h2>
            <ul className="mt-3 space-y-2">
              {guides.map((g) => (
                <li key={g.slug}>
                  <Link href={`${BLOG_BASE}/${g.slug}`} className="font-semibold text-[#3B6EF5] hover:underline">{g.title} →</Link>
                </li>
              ))}
              {t.relatedSolutions?.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="font-semibold text-[#3B6EF5] hover:underline">{s.label} →</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {guides.length === 0 && t.relatedSolutions && t.relatedSolutions.length > 0 && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500" style={{ fontFamily: "var(--font-sora)" }}>Sur OFManager</h2>
            <ul className="mt-3 space-y-2">
              {t.relatedSolutions.map((s) => (
                <li key={s.href}><Link href={s.href} className="font-semibold text-[#3B6EF5] hover:underline">{s.label} →</Link></li>
              ))}
            </ul>
          </div>
        )}
      </article>

      {/* ===== VOIR AUSSI (maillage glossaire) ===== */}
      {seeAlso.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
          <h2 className="text-lg font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Voir aussi</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {seeAlso.map((s) => (
              <Link key={s.slug} href={`${GLOSSAIRE_BASE}/${s.slug}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#0D1B3E] hover:border-[#3B6EF5] hover:text-[#3B6EF5]">
                {s.term}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ===== CTA ===== */}
      <section className="mt-8 text-white" style={{ background: `linear-gradient(135deg, ${BLUE}, ${NAVY})` }}>
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <h2 className="text-2xl font-extrabold sm:text-3xl" style={{ fontFamily: "var(--font-sora)" }}>Un logiciel qui parle le langage de votre métier</h2>
          <p className="mx-auto mt-3 max-w-lg text-[#dce7ff]">OFManager préconfigure vos formations réglementées et pilote tout votre organisme, de l&apos;inscription à l&apos;audit.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/demo" className="rounded-xl bg-white px-7 py-3 font-semibold text-[#0D1B3E] hover:bg-slate-100">Demander une démo <ArrowRight className="inline h-4 w-4" /></Link>
            <Link href="/fonctionnalites" className="rounded-xl border border-white/40 px-7 py-3 font-semibold hover:bg-white/10">Voir les fonctionnalités</Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#0D1B3E] py-8 text-center text-xs text-[#9fb0d0]">
        © 2026 OFManager — une solution <strong className="text-white">CAP SOLUTIONS</strong>. · <Link href={GLOSSAIRE_BASE} className="text-[#9fb0d0] hover:text-white">Glossaire</Link> · <Link href={BLOG_BASE} className="text-[#9fb0d0] hover:text-white">Blog</Link>
      </footer>
    </main>
  );
}
