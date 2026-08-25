// src/components/comparatif/vs-page.tsx
// Page « OFManager vs {concurrent} » (Server Component). Pilotée par lib/comparatif/data.
// Honnête et sourcée (pub comparative FR). FAQ = source unique visible + JSON-LD.
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { SITE_URL } from "@/lib/site-url";
import { ScrollReveal } from "@/components/site/scroll-reveal";
import {
  type Competitor,
  COMPARATIF_BASE,
  COMPARATIF_MAJ_LABEL,
  COMPARE_ROWS,
  OFMANAGER,
} from "@/lib/comparatif/data";

const NAVY = "#0D1B3E";
const BLUE = "#3B6EF5";

function Verdict({ v }: { v: "ofm" | "parite" | "comp" }) {
  if (v === "ofm") return <span className="inline-flex items-center gap-1 rounded-full bg-[#12B886]/12 px-2 py-0.5 text-[11px] font-bold text-[#0E9E73]"><Check className="h-3 w-3" /> OFManager</span>;
  if (v === "comp") return <span className="inline-flex items-center gap-1 rounded-full bg-[#E8A33D]/15 px-2 py-0.5 text-[11px] font-bold text-[#B9791B]">Avantage concurrent</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500"><Minus className="h-3 w-3" /> Parité</span>;
}

export function VsPage({ competitor }: { competitor: Competitor }) {
  const c = competitor;
  const base = SITE_URL;
  const url = `${base}${COMPARATIF_BASE}/${c.vsSlug}`;

  const faqs = [
    {
      q: `Quelle est la meilleure alternative à ${c.name} pour un organisme de sécurité privée ou de transport ?`,
      a: `OFManager est conçu spécifiquement pour les OF réglementés : les formations sécurité (TFP APS, SSIAP…) et transport (VTC/Taxi, T3P) sont préconfigurées avec leurs prérequis, et chaque titre délivré est vérifiable en ligne (anti-fraude). Pour un organisme généraliste, ${c.name} reste une solution solide.`,
    },
    {
      q: `OFManager fait-il la même chose que ${c.name} ?`,
      a: `Sur le cœur du métier — inscriptions, sessions, préparation Qualiopi, e-learning, signature électronique, facturation — les deux se recouvrent largement. La différence tient à la spécialisation : OFManager préconfigure les formations réglementées et ajoute la vérification anti-fraude des titres.`,
    },
    {
      q: `${c.name} publie-t-il ses tarifs ?`,
      a: `D'après son site (${COMPARATIF_MAJ_LABEL}), ${c.name} propose une tarification sur devis, sans grille publique. OFManager publie ses tarifs sur sa page dédiée.`,
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: base },
          { "@type": "ListItem", position: 2, name: "Comparatif", item: `${base}${COMPARATIF_BASE}` },
          { "@type": "ListItem", position: 3, name: `OFManager vs ${c.name}`, item: url },
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
          <Link href={COMPARATIF_BASE} className="ml-2 text-sm text-slate-500 hover:text-[#3B6EF5]">← Comparatifs</Link>
          <Link href="/demo" className="ml-auto rounded-lg bg-[#3B6EF5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2954D4]">Demander une démo</Link>
        </div>
      </header>

      {/* HERO + TL;DR */}
      <section className="text-white" style={{ background: `radial-gradient(900px 500px at 80% -10%, rgba(59,110,245,.25), transparent 60%), linear-gradient(180deg, ${NAVY}, #12245A)` }}>
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <nav aria-label="Fil d'Ariane" className="mb-5 text-xs text-[#9fb4de]">
            <Link href="/" className="hover:text-white">Accueil</Link><span className="mx-1.5">/</span>
            <Link href={COMPARATIF_BASE} className="hover:text-white">Comparatif</Link><span className="mx-1.5">/</span>
            <span className="text-[#cfe0ff]">OFManager vs {c.name}</span>
          </nav>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl" style={{ fontFamily: "var(--font-sora)" }}>
            OFManager <span className="text-[#7FA3FF]">vs {c.name}</span>
          </h1>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-[15px] leading-relaxed text-[#dfe6f6]">
            <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-[#7FA3FF]">En bref</span>
            {c.name} se positionne comme {c.tagline} OFManager, lui, cible plus précisément les{" "}
            <strong className="text-white">organismes réglementés en sécurité privée et transport</strong> : formations et
            prérequis préconfigurés, et vérification anti-fraude des titres délivrés. Le bon choix dépend de votre métier.
          </div>
        </div>
      </section>

      {/* AT-A-GLANCE TABLE */}
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>D&apos;un coup d&apos;œil</h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="py-3 pr-4 font-bold text-[#0D1B3E]" style={{ fontFamily: "var(--font-sora)" }}></th>
                <th className="py-3 pr-4 font-bold text-[#3B6EF5]" style={{ fontFamily: "var(--font-sora)" }}>OFManager</th>
                <th className="py-3 pr-4 font-bold text-[#0D1B3E]" style={{ fontFamily: "var(--font-sora)" }}>{c.name}</th>
                <th className="py-3 font-bold text-[#0D1B3E]" style={{ fontFamily: "var(--font-sora)" }}></th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((r) => (
                <tr key={r.dim} className="border-b border-slate-100 align-top">
                  <td className="py-3 pr-4 font-semibold text-[#0D1B3E]">{r.dim}</td>
                  <td className="py-3 pr-4 text-slate-700">{r.ofm}</td>
                  <td className="py-3 pr-4 text-slate-600">{r.comp(c)}</td>
                  <td className="py-3 whitespace-nowrap"><Verdict v={r.verdict} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Comparatif établi à partir des informations publiques du site de l&apos;éditeur ({COMPARATIF_MAJ_LABEL}). Les
          fonctionnalités et tarifs peuvent évoluer — vérifiez sur <a href={c.source.href} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-[#3B6EF5] hover:underline">{c.source.label} ↗</a>.
        </p>
      </section>

      {/* DÉTAIL PAR THÈME */}
      <section className="mx-auto max-w-4xl px-4 pb-4 text-[15.5px] leading-7 text-slate-700 sm:px-6 [&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-[#0D1B3E] [&_p]:mt-3">
        <h2 className="text-2xl font-extrabold text-[#0D1B3E]" style={{ fontFamily: "var(--font-sora)" }}>La comparaison en détail</h2>

        <h3>Spécialisation métier</h3>
        <p>
          C&apos;est la différence structurante. {c.name} est une <strong>plateforme généraliste</strong> : elle s&apos;adresse
          à tous les organismes de formation et couvre tous les domaines, ce qui suppose de <strong>paramétrer</strong> vos
          formations et vos prérequis. OFManager arrive avec les formations <strong>sécurité (TFP APS, SSIAP, CNAPS) et
          transport (VTC/Taxi, T3P) déjà prêtes</strong>, prérequis réglementaires inclus.
        </p>

        <h3>Fonctionnalités cœur</h3>
        <p>
          Sur le socle — inscriptions, sessions, e-learning, signature électronique, CRM, facturation, préparation Qualiopi —
          les deux outils sont <strong>comparables</strong>. {c.name} est une solution mature et complète&nbsp;: {c.forces[0].toLowerCase()}.
          OFManager ajoute un élément que les généralistes ne mettent pas en avant : la <strong>vérification anti-fraude
          publique</strong> des titres délivrés (numéro + QR vérifiable par un employeur ou une préfecture).
        </p>

        <h3>Tarification</h3>
        <p>
          {c.name} fonctionne sur <strong>devis</strong>, sans grille publique sur son site ({COMPARATIF_MAJ_LABEL}). OFManager
          affiche au contraire ses <Link href="/tarifs">tarifs publiquement</Link> — utile pour comparer et décider sans passer
          par un cycle commercial.
        </p>
      </section>

      {/* POUR QUI */}
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl p-7 text-white" style={{ background: `linear-gradient(180deg, ${NAVY}, #12245A)` }}>
            <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-sora)" }}>OFManager est fait pour…</h2>
            <p className="mt-3 text-sm text-[#dfe6f6]">{OFMANAGER.bestFor}</p>
            <ul className="mt-4 space-y-2 text-sm text-[#dfe6f6]">
              {OFMANAGER.differentiateurs.map((d) => (
                <li key={d} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#12B886]" /> {d}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-7">
            <h2 className="text-xl font-bold text-[#0D1B3E]" style={{ fontFamily: "var(--font-sora)" }}>{c.name} est fait pour…</h2>
            <p className="mt-3 text-sm text-slate-600">{c.bestFor}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {c.forces.map((f) => (
                <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#3B6EF5]" /> {f}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          Deux bons outils, deux cibles différentes. Si votre cœur de métier est <strong>réglementé</strong>, la spécialisation
          d&apos;OFManager fait la différence au quotidien.
        </p>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-4 pb-4 sm:px-6">
        <h2 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Questions fréquentes</h2>
        <div className="mt-6 space-y-3">
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
          <h2 className="text-2xl font-extrabold sm:text-3xl" style={{ fontFamily: "var(--font-sora)" }}>Voyez OFManager sur votre métier</h2>
          <p className="mx-auto mt-3 max-w-lg text-[#dce7ff]">Une démonstration sur vos formations réglementées vaut mieux qu&apos;un tableau comparatif.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/demo" className="rounded-xl bg-white px-7 py-3 font-semibold text-[#0D1B3E] hover:bg-slate-100">Demander une démo <ArrowRight className="inline h-4 w-4" /></Link>
            <Link href="/tarifs" className="rounded-xl border border-white/40 px-7 py-3 font-semibold hover:bg-white/10">Voir les tarifs</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0D1B3E] py-8 text-center text-xs text-[#9fb0d0]">
        © 2026 OFManager — une solution <strong className="text-white">CAP SOLUTIONS</strong>. · <Link href={COMPARATIF_BASE} className="text-[#9fb0d0] hover:text-white">Comparatifs</Link> · <Link href="/guides" className="text-[#9fb0d0] hover:text-white">Blog</Link>
      </footer>
    </main>
  );
}
