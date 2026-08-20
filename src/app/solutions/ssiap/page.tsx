// Page « solution » SEO : logiciel pour les formations SSIAP (sécurité incendie).
import { SITE_URL } from "@/lib/site-url";
// Server Component — même structure que /solutions/sst, palette v2 de la landing
// (accent orange = domaine SSIAP/incendie, bleu = CTA).
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { ScrollReveal } from "@/components/site/scroll-reveal";

// ---- SEO ----------------------------------------------------------------
// title < 60 car., ABSOLU (pas de template dans le layout) ; description < 160 car.
// canonical RELATIF : metadataBase (layout) résout le domaine via NEXT_PUBLIC_SITE_URL.
export const metadata: Metadata = {
  title: "Logiciel formation SSIAP — OFManager, du jury au recyclage",
  description:
    "Logiciel formation SSIAP 1·2·3 : prérequis par niveau, jurys avec président de jury, diplômes SSIAP, recyclages triennaux relancés à temps. Pour les OF.",
  alternates: { canonical: "/solutions/ssiap" },
  openGraph: {
    title: "Logiciel formation SSIAP — OFManager, du jury au recyclage",
    description:
      "Prérequis SSIAP 1·2·3 vérifiés, jurys avec président de jury, diplômes SSIAP, registres préfecture et recyclages triennaux relancés automatiquement.",
    url: "/solutions/ssiap",
  },
};

// ---- Palette v2 (landing) ----------------------------------------------
const NAVY = "#0D1B3E";
const BLUE = "#3B6EF5"; // CTA
const ORANGE = "#EA580C"; // marqueur domaine SSIAP / sécurité incendie
const ACCENT = ORANGE;
const CHIP_TEXT = "#C2410C"; // lisibilité des chips orange sur fond clair

// Faits réglementaires : uniquement ceux du brief (SSIAP 1·2·3, formations
// initiales / remises à niveau / recyclages triennaux, agréments préfectoraux
// de l'OF, jurys avec président de jury, diplômes SSIAP, prérequis par niveau,
// registres préfecture, Qualiopi).
const steps = [
  {
    n: 1,
    t: "Agrément préfectoral & création de la session",
    d: "OFManager suit les agréments préfectoraux de votre organisme et vous rappelle leurs échéances. Vous créez votre session SSIAP 1, 2 ou 3 — formation initiale, remise à niveau ou recyclage — avec formateur, dates et lieu.",
    chips: ["Agrément préfectoral", "SSIAP 1·2·3", "Initiale · Remise à niveau · Recyclage"],
  },
  {
    n: 2,
    t: "Prérequis vérifiés, niveau par niveau",
    d: "La checklist des prérequis s'adapte au niveau : secourisme à jour et aptitude médicale pour le SSIAP 1, expérience en ERP/IGH pour le SSIAP 2, diplôme requis pour le SSIAP 3. Aucun candidat n'entre en formation avec un dossier incomplet.",
    chips: ["Secourisme à jour", "Aptitude médicale", "Expérience ERP/IGH", "Diplôme (SSIAP 3)"],
  },
  {
    n: 3,
    t: "Formation & preuves Qualiopi",
    d: "Émargements, conventions, suivi pédagogique : toutes les preuves de réalisation sont collectées et rattachées au dossier de session, prêtes pour un audit Qualiopi.",
    chips: ["Émargement", "Convention", "Preuves Qualiopi"],
  },
  {
    n: 4,
    t: "Jury d'examen avec président de jury",
    d: "Les sessions SSIAP passent devant un jury présidé par un président de jury : OFManager organise l'examen, génère les convocations et consigne les résultats de chaque candidat.",
    chips: ["Jury", "Président de jury", "Convocations"],
  },
  {
    n: 5,
    t: "Diplômes SSIAP & registres préfecture",
    d: "Les diplômes SSIAP des candidats reçus sont édités et archivés dans leur dossier, et les registres destinés à la préfecture sont tenus au même endroit que vos sessions.",
    chips: ["Diplôme SSIAP", "Registres préfecture"],
  },
  {
    n: 6,
    t: "Échéancier des recyclages triennaux",
    d: "Chaque diplôme déclenche son échéance de recyclage triennal. OFManager tient l'échéancier, gère aussi les remises à niveau et relance automatiquement les stagiaires avant la date limite : vos anciens stagiaires reviennent chez vous.",
    chips: ["Recyclage triennal", "Remise à niveau", "Relance automatique"],
  },
];

// FAQ = SOURCE UNIQUE : alimente la FAQ visible ET le JSON-LD FAQPage
// (les deux doivent rester identiques pour les rich snippets Google).
const faqs = [
  {
    q: "Comment OFManager gère-t-il les recyclages SSIAP ?",
    a: "Le recyclage SSIAP est triennal : OFManager calcule l'échéance de chaque diplômé, tient l'échéancier des recyclages et des remises à niveau, et envoie des relances automatiques avant la date limite — vos stagiaires reviennent chez vous, pas chez un concurrent.",
  },
  {
    q: "OFManager vérifie-t-il les prérequis SSIAP 1, 2 et 3 ?",
    a: "Oui. La checklist des prérequis s'adapte au niveau préparé : secourisme à jour et aptitude médicale pour le SSIAP 1, expérience en ERP/IGH pour le SSIAP 2, diplôme requis pour le SSIAP 3. Chaque pièce est suivie candidat par candidat.",
  },
  {
    q: "Comment se passe l'organisation du jury SSIAP ?",
    a: "OFManager organise vos sessions d'examen avec jury et président de jury : convocations générées, résultats consignés candidat par candidat, puis diplômes SSIAP édités et archivés dans chaque dossier.",
  },
  {
    q: "OFManager m'aide-t-il pour l'agrément préfectoral et les registres ?",
    a: "Oui. Les agréments préfectoraux de votre organisme sont suivis avec rappel avant échéance, les registres destinés à la préfecture sont tenus dans la plateforme, et les preuves Qualiopi (émargements, conventions, suivi pédagogique) sont archivées session par session.",
  },
];

// Maillage interne : les 3 autres pages solutions (+ TFP APS en pied de section).
const otherSolutions = [
  { href: "/solutions/sst", label: "SST — secourisme au travail" },
  { href: "/solutions/vtc-taxi", label: "VTC & Taxi" },
  { href: "/solutions/qualiopi", label: "Qualiopi — conformité & audits" },
];

export default function SsiapPage() {
  // JSON-LD domaine-agnostique : base sert UNIQUEMENT ici, jamais dans metadata.
  // L'Organization est déclarée sur la landing → référencée par @id.
  const base = SITE_URL;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: base },
          { "@type": "ListItem", position: 2, name: "Logiciel formation SSIAP", item: `${base}/solutions/ssiap` },
        ],
      },
      {
        "@type": "Service",
        name: "Gestion des formations SSIAP pour organismes de formation",
        serviceType: "Logiciel de gestion de formations SSIAP (sécurité incendie)",
        description:
          "OFManager gère le cycle complet des formations SSIAP 1, 2 et 3 : prérequis vérifiés par niveau, jurys avec président de jury, diplômes SSIAP, registres préfecture, agréments préfectoraux de l'organisme et échéancier des recyclages triennaux avec relances.",
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
      {/* skip={1} : ne saute que le hero (le <header> n'est pas une <section>) */}
      <ScrollReveal skip={1} />

      {/* ===== HEADER sticky ===== */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Link href="/"><Image src="/ofmanager-logo.png" alt="OFManager" width={150} height={48} priority className="h-9 w-auto" /></Link>
          <Link href="/" className="ml-2 text-sm text-slate-500 hover:text-[#3B6EF5]">← Retour</Link>
          <Link href="/demo" className="ml-auto rounded-lg bg-[#3B6EF5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2954D4]">Demander une démo</Link>
        </div>
      </header>

      {/* ===== 1. HERO (H1 = requête cible) ===== */}
      <section className="text-white" style={{ background: `radial-gradient(900px 500px at 80% -10%, rgba(234,88,12,.18), transparent 60%), linear-gradient(180deg, ${NAVY}, #12245A)` }}>
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-[#f8cdb0]">🔥 Sécurité incendie · Formation réglementée</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl" style={{ fontFamily: "var(--font-sora)" }}>
            Logiciel formation SSIAP : du jury au recyclage, <span style={{ color: "#FB923C" }}>tout le cycle géré</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-[#bccbe9]">
            OFManager est le logiciel formation SSIAP qui vérifie les prérequis de chaque niveau, organise vos jurys avec président de jury, édite les diplômes SSIAP et relance vos stagiaires avant leur recyclage triennal — pendant que vous formez.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/demo" className="rounded-xl bg-[#3B6EF5] px-6 py-3 font-semibold text-white hover:bg-[#2954D4]">Demander une démo <ArrowRight className="inline h-4 w-4" /></Link>
            <a href="#fonctionnement" className="rounded-xl border border-white/40 px-6 py-3 font-semibold hover:bg-white/10">Voir le fonctionnement</a>
          </div>
          {/* Faits réglementaires du brief uniquement */}
          <div className="mt-7 flex flex-wrap gap-x-7 gap-y-2 text-sm text-[#cdd8f0]">
            <span><b className="text-white">SSIAP 1·2·3</b> initiale, remise à niveau, recyclage</span>
            <span><b className="text-white">Recyclage triennal</b> avec relances</span>
            <span><b className="text-white">Jury</b> &amp; président de jury</span>
            <span><b className="text-white">Agrément préfectoral</b> de l&apos;OF suivi</span>
          </div>
        </div>
      </section>

      {/* ===== 2. DOULEURS — Sans / Avec ===== */}
      <section className="bg-[#F5F8FD] py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Le quotidien d&apos;un OF sécurité incendie aujourd&apos;hui</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-7">
              <h3 className="font-bold">😰 Sans OFManager</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
                {[
                  "Les prérequis SSIAP 1, 2 et 3 vérifiés à la main, candidat par candidat, pièce par pièce",
                  "Les échéances de recyclage triennal suivies sur un tableur — et des stagiaires perdus faute de relance",
                  "Jurys et présidents de jury organisés par e-mails et coups de téléphone",
                  "Les registres pour la préfecture reconstitués dans l'urgence à chaque demande",
                  "L'échéance de l'agrément préfectoral notée quelque part, jamais au bon endroit",
                ].map((t) => (
                  <li key={t} className="flex gap-2"><span className="font-bold text-red-500">✕</span> {t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl p-7 text-white" style={{ background: `linear-gradient(180deg, ${NAVY}, #12245A)` }}>
              <h3 className="font-bold">✨ Avec OFManager</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-[#dfe6f6]">
                {[
                  "Checklist de prérequis adaptée au niveau : secourisme et aptitude médicale (SSIAP 1), expérience ERP/IGH (SSIAP 2), diplôme (SSIAP 3)",
                  "Échéancier des recyclages triennaux et des remises à niveau, relances automatiques avant la date limite",
                  "Jurys planifiés avec leur président de jury, convocations générées, résultats consignés",
                  "Diplômes SSIAP édités et archivés, registres préfecture tenus en continu",
                  "Agrément préfectoral de l'OF suivi, preuves Qualiopi archivées session par session",
                ].map((t) => (
                  <li key={t} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#12B886]" /> {t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 3. CE QUE FAIT OFMANAGER — timeline ===== */}
      <section id="fonctionnement" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Un logiciel formation SSIAP qui suit tout le cycle, jusqu&apos;au recyclage</h2>
        <div className="mt-12 space-y-5">
          {steps.map((s, i) => (
            <div key={s.n} className="relative grid grid-cols-[56px_1fr] gap-5">
              {i < steps.length - 1 && <span className="absolute left-[27px] top-14 bottom-0 w-0.5 bg-slate-200" />}
              <div className="z-10 grid h-12 w-12 place-items-center rounded-2xl text-lg font-extrabold text-white" style={{ background: s.n === 1 ? ACCENT : NAVY }}>{s.n}</div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold">{s.t}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{s.d}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.chips.map((c) => <span key={c} className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${ACCENT}1A`, color: CHIP_TEXT }}>{c}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 4. MINI-MOCKUP ===== */}
      <section className="bg-[#F5F8FD] py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Votre tableau de bord sécurité incendie</h2>
          <div className="mt-10 rounded-[20px] p-4 shadow-xl" style={{ background: NAVY }}>
            <div className="mb-3 flex items-center justify-between text-xs text-[#c7d3ef]">
              <div className="flex gap-1.5"><i className="h-2 w-2 rounded-full bg-white/20" /><i className="h-2 w-2 rounded-full bg-white/20" /><i className="h-2 w-2 rounded-full bg-white/20" /></div>
              <span>Suivi SSIAP — OFManager</span>
            </div>
            <div className="rounded-xl bg-white p-4">
              {/* KPI d'illustration (effectifs fictifs), aucune promesse chiffrée */}
              <div className="mb-3 grid grid-cols-3 gap-2.5">
                <div className="rounded-lg border border-slate-200 bg-[#F5F8FD] p-3"><div className="text-xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>14</div><div className="text-[11px] text-slate-500">stagiaires SSIAP en cours</div></div>
                <div className="rounded-lg border border-slate-200 bg-[#F5F8FD] p-3"><div className="text-xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>6</div><div className="text-[11px] text-slate-500">recyclages à programmer</div></div>
                <div className="rounded-lg border border-slate-200 bg-[#F5F8FD] p-3"><div className="text-xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>2</div><div className="text-[11px] text-slate-500">jurys à venir</div></div>
              </div>
              {/* Lignes candidats : statuts = vocabulaire du brief */}
              <div className="flex items-center gap-2.5 border-t border-slate-200 py-2 text-sm">
                <span className="grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold text-white" style={{ background: ACCENT }}>LP</span>
                Lucas P. · SSIAP 1 initiale
                <span className="ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: `${ACCENT}1A`, color: CHIP_TEXT }}>Prérequis complets</span>
              </div>
              <div className="flex items-center gap-2.5 border-t border-slate-200 py-2 text-sm">
                <span className="grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold text-white" style={{ background: NAVY }}>MR</span>
                Mehdi R. · SSIAP 2
                <span className="ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: `${ACCENT}1A`, color: CHIP_TEXT }}>Convoqué au jury</span>
              </div>
              <div className="flex items-center gap-2.5 border-t border-slate-200 py-2 text-sm">
                <span className="grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold text-white" style={{ background: ACCENT }}>CD</span>
                Claire D. · Recyclage SSIAP 1
                <span className="ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: `${ACCENT}1A`, color: CHIP_TEXT }}>Relance triennale envoyée</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 5. FAQ (même tableau que le JSON-LD — ne jamais diverger) ===== */}
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

      {/* ===== 6. CTA DÉMO ===== */}
      <section className="text-white" style={{ background: `linear-gradient(135deg, ${BLUE}, ${NAVY})` }}>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Voyez OFManager gérer une session SSIAP en direct</h2>
          <p className="mx-auto mt-3 max-w-md text-[#dce7ff]">Démonstration personnalisée sur vos formations SSIAP : prérequis, jurys, diplômes, recyclages triennaux.</p>
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

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#0D1B3E] py-8 text-center text-xs text-[#9fb0d0]">© 2026 OFManager — une solution <strong className="text-white">CAP SOLUTIONS</strong>.</footer>
    </main>
  );
}
