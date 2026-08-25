// src/app/comparatif/page.tsx
// Hub des comparatifs. Server Component. Positionnement honnête + critères de choix.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { SITE_URL } from "@/lib/site-url";
import { ScrollReveal } from "@/components/site/scroll-reveal";
import { COMPETITORS, COMPARATIF_BASE, COMPARATIF_MAJ_LABEL } from "@/lib/comparatif/data";

const NAVY = "#0D1B3E";
const BLUE = "#3B6EF5";

export const metadata: Metadata = {
  title: "Comparatif logiciels pour organismes de formation",
  description:
    "Comparatif des logiciels de gestion pour organismes de formation : OFManager vs Digiforma, vs Dendreo. Le bon choix pour un OF réglementé (sécurité, transport).",
  alternates: { canonical: COMPARATIF_BASE },
  openGraph: {
    title: "Comparatif logiciels pour organismes de formation",
    description: "OFManager vs Digiforma, vs Dendreo : quel logiciel pour votre organisme de formation ?",
    url: COMPARATIF_BASE,
  },
};

const CRITERES = [
  ["Spécialisation métier", "Vos formations réglementées (sécurité, transport) sont-elles préconfigurées avec leurs prérequis, ou faut-il tout paramétrer ?"],
  ["Préparation Qualiopi", "Les preuves se rattachent-elles aux 32 indicateurs en continu, avec un dossier d'audit exportable ?"],
  ["Périmètre tout-en-un", "Inscriptions, e-learning, signature, financement, facturation : tout est-il réuni, sans modules à recoller ?"],
  ["Traçabilité & anti-fraude", "Les titres délivrés sont-ils vérifiables par un tiers (employeur, préfecture) ?"],
  ["Tarification", "Les tarifs sont-ils publics et clairs, ou faut-il passer par un devis pour se situer ?"],
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
          { "@type": "ListItem", position: 2, name: "Comparatif", item: `${base}${COMPARATIF_BASE}` },
        ],
      },
      {
        "@type": "ItemList",
        name: "Comparatifs de logiciels pour organismes de formation",
        itemListElement: COMPETITORS.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `OFManager vs ${c.name}`,
          url: `${base}${COMPARATIF_BASE}/${c.vsSlug}`,
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
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Link href="/"><Image src="/ofmanager-logo.png" alt="OFManager" width={150} height={48} priority className="h-9 w-auto" /></Link>
          <Link href="/" className="ml-2 text-sm text-slate-500 hover:text-[#3B6EF5]">← Accueil</Link>
          <Link href="/demo" className="ml-auto rounded-lg bg-[#3B6EF5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2954D4]">Demander une démo</Link>
        </div>
      </header>

      {/* HERO */}
      <section className="text-white" style={{ background: `radial-gradient(900px 500px at 80% -10%, rgba(59,110,245,.25), transparent 60%), linear-gradient(180deg, ${NAVY}, #12245A)` }}>
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-[#cfe0ff]">⚖️ Comparatif</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl" style={{ fontFamily: "var(--font-sora)" }}>
            Quel logiciel pour votre <span style={{ color: "#7FA3FF" }}>organisme de formation</span> ?
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-[#bccbe9]">
            Les plateformes généralistes couvrent tous les domaines. OFManager est pensé pour les OF <strong>réglementés</strong>
            {" "}(sécurité privée, VTC/Taxi). Voici des comparaisons honnêtes pour vous aider à choisir.
          </p>
        </div>
      </section>

      {/* CRITÈRES */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Que regarder avant de choisir</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CRITERES.map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 font-bold text-[#0D1B3E]" style={{ fontFamily: "var(--font-sora)" }}>
                <Check className="h-4 w-4 text-[#12B886]" /> {t}
              </div>
              <p className="mt-2 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMPARATIFS */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <h2 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Nos comparatifs</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {COMPETITORS.map((c) => (
            <Link key={c.vsSlug} href={`${COMPARATIF_BASE}/${c.vsSlug}`} className="group rounded-2xl border border-slate-200 bg-white p-7 transition hover:-translate-y-0.5 hover:border-[#3B6EF5] hover:shadow-lg">
              <h3 className="text-xl font-extrabold text-[#0D1B3E] group-hover:text-[#3B6EF5]" style={{ fontFamily: "var(--font-sora)" }}>OFManager vs {c.name}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{c.whatItIs}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#3B6EF5]">Lire le comparatif <ArrowRight className="h-4 w-4" /></span>
            </Link>
          ))}
        </div>
        <p className="mt-6 text-xs text-slate-400">
          Comparaisons établies à partir des informations publiques des sites des éditeurs ({COMPARATIF_MAJ_LABEL}). Les
          fonctionnalités et tarifs de chaque solution peuvent évoluer.
        </p>
      </section>

      {/* CTA */}
      <section className="text-white" style={{ background: `linear-gradient(135deg, ${BLUE}, ${NAVY})` }}>
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <h2 className="text-2xl font-extrabold sm:text-3xl" style={{ fontFamily: "var(--font-sora)" }}>Le plus simple : voir OFManager sur votre métier</h2>
          <p className="mx-auto mt-3 max-w-lg text-[#dce7ff]">Une démo sur vos formations réglementées vaut mieux que n&apos;importe quel tableau.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/demo" className="rounded-xl bg-white px-7 py-3 font-semibold text-[#0D1B3E] hover:bg-slate-100">Demander une démo <ArrowRight className="inline h-4 w-4" /></Link>
            <Link href="/fonctionnalites" className="rounded-xl border border-white/40 px-7 py-3 font-semibold hover:bg-white/10">Voir les fonctionnalités</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0D1B3E] py-8 text-center text-xs text-[#9fb0d0]">
        © 2026 OFManager — une solution <strong className="text-white">CAP SOLUTIONS</strong>. · <Link href="/guides" className="text-[#9fb0d0] hover:text-white">Blog</Link> · <Link href="/glossaire" className="text-[#9fb0d0] hover:text-white">Glossaire</Link>
      </footer>
    </main>
  );
}
