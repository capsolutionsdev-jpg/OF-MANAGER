import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { ScrollReveal } from "@/components/site/scroll-reveal";

export const metadata: Metadata = {
  title: "Logiciel formation SST & MAC SST — OFManager, grilles INRS",
  description:
    "Logiciel formation SST : grilles de certification INRS pré-remplies, échéancier MAC SST 24 mois, exports FORPREV, suivi d'habilitation INRS. Pour les OF.",
  alternates: { canonical: "/solutions/sst" },
  openGraph: {
    title: "Logiciel formation SST & MAC SST — OFManager",
    description:
      "Grilles de certification INRS pré-remplies, échéancier MAC SST 24 mois, exports FORPREV et suivi d'habilitation INRS pour les organismes de formation.",
    url: "/solutions/sst",
  },
};

const NAVY = "#0D1B3E";
const BLUE = "#3B6EF5";
const ACCENT = BLUE;

// Faits réglementaires : uniquement ceux du brief (SST initial, MAC SST à 24 mois,
// grilles de certification INRS signées formateur, habilitation INRS de l'OF,
// déclaration des sessions et remontée FORPREV, cartes SST).
const steps = [
  {
    n: 1,
    t: "Habilitation INRS & création de la session",
    d: "OFManager suit l'habilitation INRS de votre organisme et vous rappelle son échéance. Vous créez votre session SST initial ou MAC SST, avec formateur, dates et entreprise cliente.",
    chips: ["Habilitation INRS", "SST initial", "MAC SST"],
  },
  {
    n: 2,
    t: "Inscriptions & déclaration de session",
    d: "Les stagiaires sont inscrits en quelques clics, en direct ou via leur entreprise. Les données de la session sont structurées pour la déclaration et la remontée FORPREV : plus de ressaisie.",
    chips: ["Session déclarée", "Entreprise cliente", "Convocations"],
  },
  {
    n: 3,
    t: "Formation & preuves Qualiopi",
    d: "Émargements, convention, suivi pédagogique : toutes les preuves de réalisation sont collectées et rattachées au dossier, prêtes pour un audit Qualiopi.",
    chips: ["Émargement", "Convention", "Preuves Qualiopi"],
  },
  {
    n: 4,
    t: "Grilles de certification INRS pré-remplies",
    d: "Pour chaque candidat, la grille de certification INRS est générée et pré-remplie automatiquement (identité, session, formation). Le formateur évalue, complète et signe — plus de grilles vierges remplies à la main la veille de l'épreuve.",
    chips: ["Grille INRS par candidat", "Signature formateur"],
  },
  {
    n: 5,
    t: "Remontée FORPREV & cartes SST",
    d: "En fin de session, OFManager vous fournit les exports prêts pour FORPREV : la remontée des résultats se fait sans retaper chaque stagiaire, et vous suivez la délivrance des cartes SST.",
    chips: ["Export FORPREV", "Carte SST"],
  },
  {
    n: 6,
    t: "Échéancier MAC SST : recyclage à 24 mois",
    d: "Chaque certificat déclenche son échéance de MAC SST à 24 mois. OFManager relance automatiquement les stagiaires ET leurs entreprises avant la date limite : votre recyclage devient une source de revenus récurrents, pas une fuite de clients.",
    chips: ["Échéance 24 mois", "Relance stagiaire", "Relance entreprise"],
  },
];

// FAQ = SOURCE UNIQUE : alimente la FAQ visible ET le JSON-LD FAQPage.
const faqs = [
  {
    q: "Comment OFManager gère-t-il les grilles de certification INRS ?",
    a: "Pour chaque candidat d'une session SST initial ou MAC SST, OFManager génère la grille de certification INRS pré-remplie avec ses informations. Le formateur n'a plus qu'à porter son évaluation et à signer : vous obtenez une grille par candidat, signée formateur, archivée dans le dossier de session.",
  },
  {
    q: "Comment fonctionne l'échéancier MAC SST ?",
    a: "Le MAC SST (maintien et actualisation des compétences) doit intervenir tous les 24 mois. OFManager calcule automatiquement l'échéance de chaque stagiaire certifié et envoie des relances au stagiaire et à son entreprise avant la date limite, pour que vos anciens stagiaires reviennent chez vous — et pas chez un concurrent.",
  },
  {
    q: "OFManager facilite-t-il la déclaration des sessions et la remontée FORPREV ?",
    a: "Oui. Les sessions et les stagiaires sont saisis une seule fois dans OFManager, qui vous fournit des exports prêts pour FORPREV : déclaration des sessions et remontée des résultats sans double saisie. OFManager suit également l'habilitation INRS de votre organisme et la délivrance des cartes SST.",
  },
  {
    q: "OFManager m'aide-t-il pour la conformité Qualiopi de mes formations SST ?",
    a: "Oui. Conventions, convocations, émargements et suivi pédagogique sont générés et archivés par session : les preuves attendues lors d'un audit Qualiopi sont rattachées à chaque dossier, aux côtés des grilles INRS signées, sans classeur papier à reconstituer.",
  },
];

const otherSolutions = [
  { href: "/solutions/ssiap", label: "Sécurité incendie SSIAP" },
  { href: "/solutions/vtc-taxi", label: "Formations VTC & Taxi" },
  { href: "/solutions/qualiopi", label: "Conformité Qualiopi" },
];

export default function SstPage() {
  const base = SITE_URL;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: base },
          { "@type": "ListItem", position: 2, name: "Logiciel formation SST & MAC SST", item: `${base}/solutions/sst` },
        ],
      },
      {
        "@type": "Service",
        name: "Gestion des formations SST et MAC SST pour organismes de formation",
        serviceType: "Logiciel de gestion de formations SST (sauveteur secouriste du travail)",
        description:
          "OFManager gère le cycle complet des formations SST : grilles de certification INRS pré-remplies et signées formateur, échéancier MAC SST à 24 mois avec relances, suivi de l'habilitation INRS, exports pour FORPREV et cartes SST.",
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

      {/* ===== 1. HERO ===== */}
      <section className="text-white" style={{ background: `radial-gradient(900px 500px at 80% -10%, rgba(59,110,245,.25), transparent 60%), linear-gradient(180deg, ${NAVY}, #12245A)` }}>
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-[#cfe0ff]">⛑️ Secourisme · Formation réglementée</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl" style={{ fontFamily: "var(--font-sora)" }}>
            Logiciel formation SST : du SST initial au MAC SST, <span style={{ color: ACCENT }}>tout le cycle géré de bout en bout</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-[#bccbe9]">
            OFManager est le logiciel formation SST qui génère vos grilles de certification INRS pré-remplies, prépare vos remontées FORPREV et relance vos stagiaires pour le MAC SST à 24 mois — pendant que vous formez.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/demo" className="rounded-xl bg-[#3B6EF5] px-6 py-3 font-semibold text-white hover:bg-[#2954D4]">Demander une démo <ArrowRight className="inline h-4 w-4" /></Link>
            <a href="#fonctionnement" className="rounded-xl border border-white/40 px-6 py-3 font-semibold hover:bg-white/10">Voir le fonctionnement</a>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-7 gap-y-2 text-sm text-[#cdd8f0]">
            <span><b className="text-white">MAC SST</b> tous les 24 mois</span>
            <span><b className="text-white">Grilles INRS</b> signées formateur</span>
            <span><b className="text-white">FORPREV</b> déclaration & remontée</span>
            <span><b className="text-white">Habilitation INRS</b> de l'OF suivie</span>
          </div>
        </div>
      </section>

      {/* ===== 2. DOULEURS — Sans / Avec ===== */}
      <section className="bg-[#F5F8FD] py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Le quotidien d'un OF secourisme aujourd'hui</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-7">
              <h3 className="font-bold">😰 Sans OFManager</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
                {[
                  "Des grilles de certification INRS remplies à la main, candidat par candidat, à chaque session",
                  "Les échéances de MAC SST à 24 mois suivies sur un tableur — et des stagiaires perdus faute de relance",
                  "Chaque session et chaque stagiaire ressaisis pour la déclaration et la remontée FORPREV",
                  "L'échéance de l'habilitation INRS de l'organisme notée quelque part, jamais au bon endroit",
                  "Des entreprises clientes relancées une par une, par téléphone, quand on y pense",
                ].map((t) => (
                  <li key={t} className="flex gap-2"><span className="font-bold text-red-500">✕</span> {t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl p-7 text-white" style={{ background: `linear-gradient(180deg, ${NAVY}, #12245A)` }}>
              <h3 className="font-bold">✨ Avec OFManager</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-[#dfe6f6]">
                {[
                  "Grilles INRS générées et pré-remplies par candidat, il ne reste que l'évaluation et la signature du formateur",
                  "Échéancier MAC SST automatique : stagiaires et entreprises relancés avant les 24 mois",
                  "Exports prêts pour FORPREV : déclaration des sessions et remontée sans double saisie",
                  "Habilitation INRS de l'OF et cartes SST suivies au même endroit que vos sessions",
                  "Preuves Qualiopi (émargements, conventions, suivi) archivées session par session",
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
        <h2 className="text-center text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Un logiciel formation SST qui suit tout le cycle, jusqu'au recyclage</h2>
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

      {/* ===== 4. MINI-MOCKUP ===== */}
      <section className="bg-[#F5F8FD] py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Votre tableau de bord secourisme</h2>
          <div className="mt-10 rounded-[20px] p-4 shadow-xl" style={{ background: NAVY }}>
            <div className="mb-3 flex items-center justify-between text-xs text-[#c7d3ef]">
              <div className="flex gap-1.5"><i className="h-2 w-2 rounded-full bg-white/20" /><i className="h-2 w-2 rounded-full bg-white/20" /><i className="h-2 w-2 rounded-full bg-white/20" /></div>
              <span>Suivi SST — OFManager</span>
            </div>
            <div className="rounded-xl bg-white p-4">
              <div className="mb-3 grid grid-cols-3 gap-2.5">
                <div className="rounded-lg border border-slate-200 bg-[#F5F8FD] p-3"><div className="text-xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>12</div><div className="text-[11px] text-slate-500">stagiaires SST en cours</div></div>
                <div className="rounded-lg border border-slate-200 bg-[#F5F8FD] p-3"><div className="text-xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>9</div><div className="text-[11px] text-slate-500">MAC SST à programmer</div></div>
                <div className="rounded-lg border border-slate-200 bg-[#F5F8FD] p-3"><div className="text-xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>3</div><div className="text-[11px] text-slate-500">grilles INRS à signer</div></div>
              </div>
              <div className="flex items-center gap-2.5 border-t border-slate-200 py-2 text-sm">
                <span className="grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold text-white" style={{ background: ACCENT }}>NB</span>
                Nadia B. · SST initial
                <span className="ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: `${ACCENT}1A`, color: ACCENT }}>Grille INRS signée</span>
              </div>
              <div className="flex items-center gap-2.5 border-t border-slate-200 py-2 text-sm">
                <span className="grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold text-white" style={{ background: ACCENT }}>KD</span>
                Karim D. · MAC SST
                <span className="ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: `${ACCENT}1A`, color: ACCENT }}>Échéance 24 mois — relance envoyée</span>
              </div>
              <div className="flex items-center gap-2.5 border-t border-slate-200 py-2 text-sm">
                <span className="grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold text-white" style={{ background: ACCENT }}>SL</span>
                Sophie L. · SST initial
                <span className="ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: `${ACCENT}1A`, color: ACCENT }}>Carte SST délivrée</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 5. FAQ (même tableau que le JSON-LD) ===== */}
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
          <h2 className="text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Voyez OFManager gérer une session SST en direct</h2>
          <p className="mx-auto mt-3 max-w-md text-[#dce7ff]">Démonstration personnalisée sur vos formations SST et MAC SST : grilles INRS, échéancier 24 mois, exports FORPREV.</p>
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
      <footer className="bg-[#0D1B3E] py-8 text-center text-xs text-[#9fb0d0]">© 2026 OFManager — une solution <strong className="text-white">CAP Compétences</strong>.</footer>
    </main>
  );
}
