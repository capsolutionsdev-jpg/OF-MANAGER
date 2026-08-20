// src/app/solutions/qualiopi/page.tsx
import { SITE_URL } from "@/lib/site-url";
// Server Component (AUCUN "use client") — mêmes imports que tfp-aps, rien de plus.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { ScrollReveal } from "@/components/site/scroll-reveal";

// ---- SEO ----------------------------------------------------------------
// title < 60 car., ABSOLU (pas de template dans le layout) ; description < 160 car.
// canonical RELATIF : metadataBase (layout) résout le domaine via NEXT_PUBLIC_SITE_URL.
export const metadata: Metadata = {
  title: "Logiciel Qualiopi — OFManager, audit prêt en permanence",
  description:
    "Logiciel Qualiopi : preuves rattachées aux 32 indicateurs, dossier d'audit exportable en 1 clic, BPF pré-rempli. Pour tout organisme de formation.",
  alternates: { canonical: "/solutions/qualiopi" },
  openGraph: {
    title: "Logiciel Qualiopi — OFManager, audit prêt en permanence",
    description:
      "Preuves rattachées aux 7 critères / 32 indicateurs, dossier d'audit en 1 clic, BPF pré-rempli, registres et traçabilité eIDAS.",
    url: "/solutions/qualiopi",
  },
};

// ---- Palette v2 (landing) — NE PAS reprendre les couleurs de tfp-aps ----
const NAVY = "#0D1B3E";
const BLUE = "#3B6EF5"; // accent transverse (CTA) — page Qualiopi
const ACCENT = BLUE;

// ---- Contenu structuré (pattern tfp-aps) --------------------------------
// FAITS RÉGLEMENTAIRES : uniquement ceux du brief. Rien d'inventé.
const steps = [
  {
    n: 1,
    t: "Chaque preuve rattachée à son indicateur",
    d: "Convention, émargement, évaluation… dès qu'un document est produit dans la plateforme, il est rattaché au bon indicateur parmi les 7 critères et 32 indicateurs du Référentiel National Qualité. La preuve se constitue au fil de l'eau, pas la veille de l'audit.",
    chips: ["7 critères", "32 indicateurs", "Preuve rattachée"],
  },
  {
    n: 2,
    t: "Les registres tenus en continu",
    d: "Réclamations, veille, partenaires : les trois registres de votre démarche qualité vivent dans OFManager et s'alimentent au quotidien, au lieu d'être reconstitués dans l'urgence avant l'échéance.",
    chips: ["Réclamations", "Veille", "Partenaires"],
  },
  {
    n: 3,
    t: "La traçabilité complète des sessions",
    d: "Émargements horodatés et signatures électroniques eIDAS : chaque présence et chaque document signé laissent une trace datée, rattachée au candidat et à la session concernée.",
    chips: ["Émargements horodatés", "Signatures eIDAS"],
  },
  {
    n: 4,
    t: "Le RGPD géré dans le même outil",
    d: "Les données de vos candidats sont gérées dans le respect du RGPD : la conformité des données personnelles avance avec la conformité qualité, sans outil supplémentaire.",
    chips: ["RGPD", "Données candidats"],
  },
  {
    n: 5,
    t: "Le BPF pré-rempli depuis vos données réelles",
    d: "Votre Bilan Pédagogique et Financier se pré-remplit à partir des données réellement saisies dans l'année : fini le BPF reconstitué à la main depuis des tableurs au moment de la déclaration.",
    chips: ["BPF automatique", "Données réelles"],
  },
  {
    n: 6,
    t: "Le dossier d'audit exporté en 1 clic",
    d: "Le jour venu, vous exportez un dossier d'audit complet, classé par indicateur : l'auditeur retrouve chaque preuve à sa place, vous restez concentré sur l'entretien.",
    chips: ["Export en 1 clic", "Classé par indicateur"],
  },
];

// FAQ = SOURCE UNIQUE : alimente la FAQ visible ET le JSON-LD FAQPage
// (les deux doivent rester identiques pour les rich snippets Google).
const faqs = [
  {
    q: "Comment OFManager prépare-t-il l'audit Qualiopi ?",
    a: "En continu : chaque preuve produite dans la plateforme est rattachée à l'un des 32 indicateurs des 7 critères du Référentiel National Qualité. Le jour de l'audit, vous exportez en 1 clic un dossier classé par indicateur, sans reconstitution manuelle.",
  },
  {
    q: "Le BPF est-il vraiment automatique ?",
    a: "Le BPF est pré-rempli à partir des données réelles saisies dans OFManager au fil de l'année. Vous vérifiez, complétez si besoin et déclarez — au lieu de tout reconstruire depuis des tableurs.",
  },
  {
    q: "Quels registres Qualiopi la plateforme tient-elle ?",
    a: "Les registres des réclamations, de la veille et des partenaires sont tenus directement dans OFManager, alimentés au quotidien et prêts à être présentés à l'auditeur.",
  },
  {
    q: "OFManager convient-il aux OF réglementés (sécurité privée, VTC/Taxi) ?",
    a: "Oui. OFManager s'adresse à tout organisme de formation, avec un focus sur les OF réglementés en sécurité privée et VTC/Taxi : traçabilité (émargements horodatés, signatures eIDAS) et RGPD sont gérés dans le même outil que la qualité.",
  },
];

// Maillage : les 3 AUTRES pages solutions (+ tfp-aps en pied de section).
const otherSolutions = [
  { href: "/solutions/ssiap", label: "SSIAP — sécurité incendie" },
  { href: "/solutions/sst", label: "SST — secourisme au travail" },
  { href: "/solutions/vtc-taxi", label: "VTC & Taxi" },
];

export default function Page() {
  // JSON-LD domaine-agnostique (pattern landing) : base sert UNIQUEMENT ici,
  // jamais dans metadata. Organization déjà déclarée sur la landing → référence par @id.
  const base = SITE_URL;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: base },
          { "@type": "ListItem", position: 2, name: "Logiciel Qualiopi", item: `${base}/solutions/qualiopi` },
        ],
      },
      {
        "@type": "Service",
        name: "Préparation d'audit Qualiopi pour organismes de formation",
        serviceType: "Logiciel Qualiopi",
        description:
          "Preuves rattachées en continu aux 7 critères et 32 indicateurs du Référentiel National Qualité, registres (réclamations, veille, partenaires), BPF pré-rempli et dossier d'audit exportable en 1 clic.",
        provider: { "@id": `${base}/#organization` },
        areaServed: "FR",
        inLanguage: "fr-FR",
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
      {/* skip={1} : ne saute que le hero (le <header> n'est pas une <section>) — comme tfp-aps */}
      <ScrollReveal skip={1} />

      {/* ===== HEADER sticky (copie tfp-aps, couleurs v2) ===== */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Link href="/"><Image src="/ofmanager-logo.png" alt="OFManager" width={150} height={48} priority className="h-9 w-auto" /></Link>
          <Link href="/" className="ml-2 text-sm text-slate-500 hover:text-[#3B6EF5]">← Retour</Link>
          <Link href="/demo" className="ml-auto rounded-lg bg-[#3B6EF5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2954D4]">Demander une démo</Link>
        </div>
      </header>

      {/* ===== 1. HERO (H1 = requête cible) ===== */}
      <section className="text-white" style={{ background: `radial-gradient(900px 500px at 80% -10%, rgba(59,110,245,.25), transparent 60%), linear-gradient(180deg, ${NAVY}, #12245A)` }}>
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-[#cfe0ff]">✅ Qualiopi · Référentiel National Qualité</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl" style={{ fontFamily: "var(--font-sora)" }}>
            Logiciel Qualiopi : votre audit, <span style={{ color: "#7FA3FF" }}>prêt en permanence</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-[#bccbe9]">
            OFManager est le logiciel Qualiopi des organismes de formation : chaque preuve est rattachée en continu aux 7 critères et 32 indicateurs du Référentiel National Qualité, et votre dossier d'audit s'exporte en 1 clic, classé par indicateur.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/demo" className="rounded-xl bg-[#3B6EF5] px-6 py-3 font-semibold text-white hover:bg-[#2954D4]">Demander une démo <ArrowRight className="inline h-4 w-4" /></Link>
            <a href="#fonctionnement" className="rounded-xl border border-white/40 px-6 py-3 font-semibold hover:bg-white/10">Voir le fonctionnement</a>
          </div>
          {/* Rangée de faits : UNIQUEMENT les faits du brief */}
          <div className="mt-7 flex flex-wrap gap-x-7 gap-y-2 text-sm text-[#cdd8f0]">
            <span><b className="text-white">7 critères</b> du Référentiel National Qualité</span>
            <span><b className="text-white">32 indicateurs</b> suivis en continu</span>
            <span><b className="text-white">BPF</b> pré-rempli automatiquement</span>
            <span><b className="text-white">Signatures eIDAS</b> &amp; émargements horodatés</span>
          </div>
        </div>
      </section>

      {/* ===== 2. DOULEURS — Sans / Avec (pattern landing) ===== */}
      <section className="bg-[#F5F8FD] py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Ce qu'un logiciel Qualiopi change à votre quotidien</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-7">
              <h3 className="font-bold">😰 Sans OFManager</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
                {[
                  "La semaine avant l'audit passée à fouiller classeurs, e-mails et dossiers partagés",
                  "Des preuves éparpillées, impossibles à relier aux 32 indicateurs",
                  "Le BPF reconstitué à la main chaque année depuis des tableurs",
                  "Des registres de réclamations et de veille ouverts la veille de l'audit",
                  "Aucune vision de ce qui est couvert ou non, critère par critère",
                ].map((t) => (
                  <li key={t} className="flex gap-2"><span className="font-bold text-red-500">✕</span> {t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl p-7 text-white" style={{ background: `linear-gradient(180deg, ${NAVY}, #12245A)` }}>
              <h3 className="font-bold">✨ Avec OFManager</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-[#dfe6f6]">
                {[
                  "Chaque preuve rattachée à son indicateur au moment où elle est produite",
                  "Les registres réclamations, veille et partenaires tenus en continu",
                  "Le BPF pré-rempli depuis vos données réelles",
                  "Un dossier d'audit exportable en 1 clic, classé par indicateur",
                  "Émargements horodatés et signatures eIDAS pour une traçabilité complète",
                ].map((t) => (
                  <li key={t} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#12B886]" /> {t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 3. CE QUE FAIT OFMANAGER — timeline (copie tfp-aps) ===== */}
      <section id="fonctionnement" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>La préparation d'audit Qualiopi, automatisée de bout en bout</h2>
        <div className="mt-12 space-y-5">
          {steps.map((s, i) => (
            <div key={s.n} className="relative grid grid-cols-[56px_1fr] gap-5">
              {i < steps.length - 1 && <span className="absolute left-[27px] top-14 bottom-0 w-0.5 bg-slate-200" />}
              <div className="z-10 grid h-12 w-12 place-items-center rounded-2xl text-lg font-extrabold text-white" style={{ background: s.n === 1 ? ACCENT : NAVY }}>{s.n}</div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold">{s.t}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{s.d}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.chips.map((c) => <span key={c} className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${ACCENT}1A`, color: ACCENT }}>{c}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 4. MINI-MOCKUP (pattern .mock de la landing, en Tailwind) ===== */}
      <section className="bg-[#F5F8FD] py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Votre tableau de bord qualité</h2>
          <div className="mt-10 rounded-[20px] p-4 shadow-xl" style={{ background: NAVY }}>
            <div className="mb-3 flex items-center justify-between text-xs text-[#c7d3ef]">
              <div className="flex gap-1.5"><i className="h-2 w-2 rounded-full bg-white/20" /><i className="h-2 w-2 rounded-full bg-white/20" /><i className="h-2 w-2 rounded-full bg-white/20" /></div>
              <span>Suivi Qualiopi — OFManager</span>
            </div>
            <div className="rounded-xl bg-white p-4">
              <div className="mb-3 grid grid-cols-3 gap-2.5">
                {/* KPI d'illustration (effectifs fictifs), jamais des promesses chiffrées */}
                <div className="rounded-lg border border-slate-200 bg-[#F5F8FD] p-3"><div className="text-xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>32</div><div className="text-[11px] text-slate-500">indicateurs suivis</div></div>
                <div className="rounded-lg border border-slate-200 bg-[#F5F8FD] p-3"><div className="text-xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>3</div><div className="text-[11px] text-slate-500">registres tenus</div></div>
                <div className="rounded-lg border border-slate-200 bg-[#F5F8FD] p-3"><div className="text-xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>148</div><div className="text-[11px] text-slate-500">preuves rattachées</div></div>
              </div>
              {/* Lignes de preuves : statuts = vocabulaire du brief */}
              <div className="flex items-center gap-2.5 border-t border-slate-200 py-2 text-sm">
                <span className="grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold text-white" style={{ background: ACCENT }}>ÉM</span>
                Émargement horodaté · session du 12 mars
                <span className="ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: `${ACCENT}1A`, color: ACCENT }}>Rattachée</span>
              </div>
              <div className="flex items-center gap-2.5 border-t border-slate-200 py-2 text-sm">
                <span className="grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold text-white" style={{ background: NAVY }}>RG</span>
                Registre des réclamations
                <span className="ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: `${ACCENT}1A`, color: ACCENT }}>Tenu</span>
              </div>
              <div className="flex items-center gap-2.5 border-t border-slate-200 py-2 text-sm">
                <span className="grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold text-white" style={{ background: NAVY }}>BPF</span>
                Bilan Pédagogique et Financier
                <span className="ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: `${ACCENT}1A`, color: ACCENT }}>Pré-rempli</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 5. FAQ (même tableau que le JSON-LD — ne JAMAIS diverger) ===== */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Questions fréquentes</h2>
        <div className="mt-10 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <summary className="cursor-pointer list-none px-5 py-4 font-semibold" style={{ fontFamily: "var(--font-sora)" }}>{f.q}</summary>
              <p className="px-5 pb-4 text-sm text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ===== 6. CTA DÉMO (copie tfp-aps, couleurs v2) ===== */}
      <section className="text-white" style={{ background: `linear-gradient(135deg, ${BLUE}, ${NAVY})` }}>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Voyez OFManager préparer votre audit Qualiopi en direct</h2>
          <p className="mx-auto mt-3 max-w-md text-[#dce7ff]">Démonstration personnalisée sur votre organisme et vos formations.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/demo" className="rounded-xl bg-white px-7 py-3 font-semibold text-[#0D1B3E] hover:bg-slate-100">Demander une démo <ArrowRight className="inline h-4 w-4" /></Link>
            <Link href="/tarifs" className="rounded-xl border border-white/40 px-7 py-3 font-semibold hover:bg-white/10">Voir les tarifs</Link>
          </div>
        </div>
      </section>

      {/* ===== 7. MAILLAGE INTERNE ===== */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <h2 className="text-center text-2xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Les autres solutions OFManager</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {otherSolutions.map((s) => (
            <Link key={s.href} href={s.href} className="rounded-2xl border border-slate-200 bg-white p-5 font-semibold hover:border-[#3B6EF5] hover:text-[#3B6EF5]">
              {s.label} <ArrowRight className="inline h-4 w-4" />
            </Link>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="font-semibold text-[#3B6EF5]">← Découvrir OFManager</Link> · <Link href="/solutions/tfp-aps" className="font-semibold text-[#3B6EF5]">TFP APS</Link>
        </p>
      </section>

      {/* ===== FOOTER (navy v2) ===== */}
      <footer className="bg-[#0D1B3E] py-8 text-center text-xs text-[#9fb0d0]">© 2026 OFManager — une solution <strong className="text-white">CAP SOLUTIONS</strong>.</footer>
    </main>
  );
}
