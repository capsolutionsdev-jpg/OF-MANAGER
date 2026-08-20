// Page « solution » SEO : logiciel pour les formations VTC & Taxi (examen T3P).
import { SITE_URL } from "@/lib/site-url";
// Server Component — même structure que /solutions/tfp-aps, palette v2 de la
// landing (accent ambre = domaine VTC/Taxi, bleu = CTA, vert = conformité).
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { ScrollReveal } from "@/components/site/scroll-reveal";

// ---- SEO ----------------------------------------------------------------
// title < 60 car., ABSOLU (pas de template dans le layout) ; description < 160 car.
// canonical RELATIF : metadataBase (layout) résout le domaine via NEXT_PUBLIC_SITE_URL.
export const metadata: Metadata = {
  title: "Logiciel formation VTC & Taxi — examen T3P sur OFManager",
  description:
    "Logiciel formation VTC & Taxi : examen T3P (CMA), identifiants T3P, formation continue 14 h / 5 ans, dossiers CPF conformes. Pour les organismes de formation.",
  alternates: { canonical: "/solutions/vtc-taxi" },
  openGraph: {
    title: "Logiciel formation VTC & Taxi — examen T3P sur OFManager",
    description:
      "Examen T3P (CMA), identifiants plateforme T3P, formation continue 14 h / 5 ans, dossiers CPF : le logiciel des OF VTC & Taxi.",
    url: "/solutions/vtc-taxi",
  },
};

// ---- Palette v2 (landing) ----------------------------------------------
const NAVY = "#0D1B3E";
const BLUE = "#3B6EF5"; // CTA
const AMBER = "#E8A33D"; // marqueur domaine VTC/Taxi (comme sur la landing)
const ACCENT = AMBER;

// ---- Contenu structuré — faits réglementaires issus du brief uniquement --
const steps = [
  {
    n: 1,
    t: "Prospect & dossier CPF conforme",
    d: "Dès le premier contact, la fiche candidat se crée avec la certification visée — VTC (RS 5637) ou Taxi (RS 5635) — et son dossier CPF se constitue pièce par pièce, conforme avant le premier jour de formation.",
    chips: ["VTC · RS 5637", "Taxi · RS 5635", "Dossier CPF"],
  },
  {
    n: 2,
    t: "Inscription à l'examen T3P (CMA)",
    d: "Vous inscrivez chaque candidat à l'examen T3P organisé par la CMA, en vous appuyant sur le calendrier des sessions d'examen CMA tenu à jour dans la plateforme.",
    chips: ["Calendrier CMA", "Session d'examen", "Inscrit examen T3P"],
  },
  {
    n: 3,
    t: "Identifiants T3P, rattachés au candidat",
    d: "Les identifiants de la plateforme nationale T3P sont conservés sur la fiche de chaque candidat : plus de comptes égarés au moment des démarches sur la plateforme.",
    chips: ["Plateforme nationale T3P", "Identifiants par candidat"],
  },
  {
    n: 4,
    t: "Formation & préparation à l'examen",
    d: "Sessions, planning, formateurs et émargements signés : toute la préparation à l'examen VTC ou Taxi est tracée, et les preuves alimentent votre conformité.",
    chips: ["Sessions", "Émargement", "Suivi pédagogique"],
  },
  {
    n: 5,
    t: "Résultat & carte professionnelle",
    d: "Après l'examen T3P, vous consignez le résultat et suivez chaque candidat jusqu'à l'obtention de sa carte professionnelle VTC ou Taxi.",
    chips: ["Résultat d'examen", "Carte professionnelle"],
  },
  {
    n: 6,
    t: "Formation continue : 14 h tous les 5 ans",
    d: "La formation continue VTC & Taxi est obligatoire : 14 h tous les 5 ans. OFManager tient l'échéancier de chaque stagiaire et déclenche une relance automatique avant l'échéance — vos anciens stagiaires reviennent chez vous.",
    chips: ["14 h / 5 ans", "Relance automatique"],
  },
];

// FAQ = SOURCE UNIQUE : alimente la FAQ visible ET le JSON-LD FAQPage
// (les deux doivent rester identiques pour les rich snippets Google).
const faqs = [
  {
    q: "OFManager gère-t-il l'inscription à l'examen T3P organisé par la CMA ?",
    a: "Oui. Vous suivez chaque candidat de son inscription à l'examen T3P jusqu'au résultat, avec le calendrier des sessions d'examen CMA directement dans la plateforme. Les identifiants de la plateforme nationale T3P sont conservés sur la fiche de chaque candidat.",
  },
  {
    q: "Le logiciel couvre-t-il l'examen VTC (RS 5637) et l'examen Taxi (RS 5635) ?",
    a: "Oui, les deux préparations sont gérées : vous rattachez chaque candidat à la certification visée — VTC (RS 5637) ou Taxi (RS 5635) — et son suivi (dossier, examen T3P, carte professionnelle) s'adapte à sa formation.",
  },
  {
    q: "Comment fonctionne la relance pour la formation continue VTC / Taxi ?",
    a: "La formation continue est obligatoire : 14 h tous les 5 ans. OFManager tient l'échéancier de chaque stagiaire et envoie une relance automatique avant l'échéance — vous sécurisez la conformité de vos anciens stagiaires et un chiffre d'affaires récurrent.",
  },
  {
    q: "Comment OFManager gère-t-il les dossiers CPF de mes candidats ?",
    a: "La plateforme structure des dossiers CPF conformes pour vos candidats VTC et Taxi : pièces suivies candidat par candidat, documents générés automatiquement, preuves conservées pour vos financeurs et vos audits.",
  },
];

// Maillage interne : les 3 autres pages solutions (+ TFP APS en pied de section).
const otherSolutions = [
  { href: "/solutions/ssiap", label: "SSIAP — sécurité incendie" },
  { href: "/solutions/sst", label: "SST — secourisme au travail" },
  { href: "/solutions/qualiopi", label: "Qualiopi — conformité & audits" },
];

export default function VtcTaxiPage() {
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
          { "@type": "ListItem", position: 2, name: "VTC & Taxi (examen T3P)", item: `${base}/solutions/vtc-taxi` },
        ],
      },
      {
        "@type": "Service",
        name: "Gestion des formations VTC & Taxi (examen T3P) pour organismes de formation",
        serviceType: "Logiciel de gestion de formations VTC & Taxi",
        description:
          "Suivi des candidats VTC (RS 5637) et Taxi (RS 5635) : inscription à l'examen T3P organisé par la CMA, identifiants de la plateforme nationale T3P, carte professionnelle, formation continue obligatoire (14 h tous les 5 ans) et dossiers CPF conformes.",
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
      <section className="text-white" style={{ background: `radial-gradient(900px 500px at 80% -10%, rgba(232,163,61,.18), transparent 60%), linear-gradient(180deg, ${NAVY}, #12245A)` }}>
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-[#f3d9ac]">🚕 VTC & Taxi · Formation réglementée T3P</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl" style={{ fontFamily: "var(--font-sora)" }}>
            Logiciel formation VTC & Taxi : l'examen T3P, <span style={{ color: ACCENT }}>géré de bout en bout</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-[#bccbe9]">
            OFManager est le logiciel des organismes de formation VTC & Taxi : inscription des candidats à l'examen T3P organisé par la CMA, identifiants de la plateforme nationale T3P, dossiers CPF conformes et formation continue — sans tableur, sans oubli.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/demo" className="rounded-xl bg-[#3B6EF5] px-6 py-3 font-semibold text-white hover:bg-[#2954D4]">Demander une démo <ArrowRight className="inline h-4 w-4" /></Link>
            <a href="#fonctionnement" className="rounded-xl border border-white/40 px-6 py-3 font-semibold hover:bg-white/10">Voir le fonctionnement</a>
          </div>
          {/* Faits réglementaires du brief uniquement */}
          <div className="mt-7 flex flex-wrap gap-x-7 gap-y-2 text-sm text-[#cdd8f0]">
            <span><b className="text-white">RS 5637</b> examen VTC</span>
            <span><b className="text-white">RS 5635</b> examen Taxi</span>
            <span><b className="text-white">Examen T3P</b> organisé par la CMA</span>
            <span><b className="text-white">14 h / 5 ans</b> de formation continue</span>
            <span><b className="text-white">CPF</b> dossiers conformes</span>
          </div>
        </div>
      </section>

      {/* ===== 2. DOULEURS — Sans / Avec ===== */}
      <section className="bg-[#F5F8FD] py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Le quotidien d'un organisme de formation VTC & Taxi aujourd'hui</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-7">
              <h3 className="font-bold">😰 Sans OFManager</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
                {[
                  "Le calendrier des sessions d'examen CMA suivi à la main, dans un tableur",
                  "Les identifiants de la plateforme nationale T3P éparpillés entre e-mails et carnets",
                  "Des dossiers CPF incomplets qui retardent ou bloquent le financement",
                  "Les échéances de formation continue (14 h tous les 5 ans) oubliées, candidat après candidat",
                  "Aucun suivi fiable entre l'examen T3P et l'obtention de la carte professionnelle",
                ].map((t) => (
                  <li key={t} className="flex gap-2"><span className="font-bold text-red-500">✕</span> {t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl p-7 text-white" style={{ background: `linear-gradient(180deg, ${NAVY}, #12245A)` }}>
              <h3 className="font-bold">✨ Avec OFManager</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-[#dfe6f6]">
                {[
                  "Le calendrier des sessions d'examen CMA centralisé et partagé avec toute l'équipe",
                  "Les identifiants T3P rattachés à la fiche de chaque candidat, retrouvés en un clic",
                  "Des dossiers CPF conformes, complets avant l'entrée en formation",
                  "Une relance automatique avant chaque échéance de formation continue obligatoire",
                  "Chaque candidat suivi de l'inscription à l'examen T3P jusqu'à la carte professionnelle",
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
        <h2 className="text-center text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>De la préparation à l'examen T3P à la formation continue, automatisé</h2>
        <div className="mt-12 space-y-5">
          {steps.map((s, i) => (
            <div key={s.n} className="relative grid grid-cols-[56px_1fr] gap-5">
              {i < steps.length - 1 && <span className="absolute left-[27px] top-14 bottom-0 w-0.5 bg-slate-200" />}
              <div className="z-10 grid h-12 w-12 place-items-center rounded-2xl text-lg font-extrabold text-white" style={{ background: s.n === 1 ? ACCENT : NAVY }}>{s.n}</div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold">{s.t}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{s.d}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.chips.map((c) => <span key={c} className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${ACCENT}1A`, color: "#A66A14" }}>{c}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 4. MINI-MOCKUP ===== */}
      <section className="bg-[#F5F8FD] py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Votre tableau de bord VTC & Taxi</h2>
          <div className="mt-10 rounded-[20px] p-4 shadow-xl" style={{ background: NAVY }}>
            <div className="mb-3 flex items-center justify-between text-xs text-[#c7d3ef]">
              <div className="flex gap-1.5"><i className="h-2 w-2 rounded-full bg-white/20" /><i className="h-2 w-2 rounded-full bg-white/20" /><i className="h-2 w-2 rounded-full bg-white/20" /></div>
              <span>Suivi T3P — OFManager</span>
            </div>
            <div className="rounded-xl bg-white p-4">
              {/* KPI d'illustration (effectifs fictifs), aucune promesse chiffrée */}
              <div className="mb-3 grid grid-cols-3 gap-2.5">
                <div className="rounded-lg border border-slate-200 bg-[#F5F8FD] p-3"><div className="text-xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>12</div><div className="text-[11px] text-slate-500">candidats en formation</div></div>
                <div className="rounded-lg border border-slate-200 bg-[#F5F8FD] p-3"><div className="text-xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>3</div><div className="text-[11px] text-slate-500">sessions d'examen CMA à venir</div></div>
                <div className="rounded-lg border border-slate-200 bg-[#F5F8FD] p-3"><div className="text-xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>8</div><div className="text-[11px] text-slate-500">relances formation continue</div></div>
              </div>
              {/* Lignes candidats : statuts = vocabulaire du brief */}
              <div className="flex items-center gap-2.5 border-t border-slate-200 py-2 text-sm">
                <span className="grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold text-white" style={{ background: ACCENT }}>KB</span>
                Karim B. · VTC (RS 5637)
                <span className="ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: `${ACCENT}1A`, color: "#A66A14" }}>Inscrit examen T3P</span>
              </div>
              <div className="flex items-center gap-2.5 border-t border-slate-200 py-2 text-sm">
                <span className="grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold text-white" style={{ background: NAVY }}>SM</span>
                Sonia M. · Taxi (RS 5635)
                <span className="ml-auto rounded-full bg-[#12B886]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#0E8A66]">Dossier CPF conforme</span>
              </div>
              <div className="flex items-center gap-2.5 border-t border-slate-200 py-2 text-sm">
                <span className="grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold text-white" style={{ background: ACCENT }}>AT</span>
                Ahmed T. · Formation continue
                <span className="ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: `${ACCENT}1A`, color: "#A66A14" }}>Relance automatique envoyée</span>
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
          <h2 className="text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Voyez OFManager gérer un dossier T3P en direct</h2>
          <p className="mx-auto mt-3 max-w-md text-[#dce7ff]">Démonstration personnalisée sur vos formations VTC & Taxi.</p>
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
