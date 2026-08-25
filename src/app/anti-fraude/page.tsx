// src/app/anti-fraude/page.tsx
// Page marketing « anti-fraude » — vend la vérification d'authenticité des titres.
// Server Component. Renvoie vers l'outil public /verification. FAITS alignés sur l'outil
// réel (numéro du titre OU QR + date de naissance du titulaire).
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck, QrCode, Search, BadgeCheck, Building2, UserCheck } from "lucide-react";
import { SITE_URL } from "@/lib/site-url";
import { ScrollReveal } from "@/components/site/scroll-reveal";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

const NAVY = "#0D1B3E";
const BLUE = "#3B6EF5";
const GREEN = "#12B886";

export const metadata: Metadata = {
  title: "Anti-fraude : des titres de formation infalsifiables — OFManager",
  description:
    "Fini les faux diplômes et attestations. Chaque titre délivré via OFManager porte un numéro unique et un QR code, vérifiables en ligne par n'importe qui, en quelques secondes.",
  alternates: { canonical: "/anti-fraude" },
  openGraph: {
    title: "Anti-fraude : des titres de formation infalsifiables",
    description:
      "Chaque titre délivré via OFManager est vérifiable en ligne (numéro + QR). Protégez votre organisme, vos clients et les candidats honnêtes contre la fraude documentaire.",
    url: "/anti-fraude",
  },
};

const faqs = [
  {
    q: "Comment vérifie-t-on l'authenticité d'un titre délivré via OFManager ?",
    a: "Chaque titre porte un numéro de vérification unique et un QR code. Un tiers (employeur, préfecture, client) scanne le QR — ou saisit le numéro — puis la date de naissance du titulaire, sur la page publique de vérification. La plateforme confirme instantanément si le titre est authentique et valide.",
  },
  {
    q: "Qui peut vérifier un titre ?",
    a: "N'importe qui, sans compte : un employeur qui recrute un agent de sécurité, une préfecture, un donneur d'ordre, ou le titulaire lui-même. La double clé (numéro + date de naissance) empêche toute recherche abusive : on ne peut vérifier qu'un titre dont on possède déjà le document.",
  },
  {
    q: "En quoi est-ce différent d'un simple PDF ou d'une attestation classique ?",
    a: "Un PDF se falsifie en quelques minutes. Un titre OFManager est adossé à un enregistrement dans la plateforme : le numéro renvoie à un titre réellement délivré par votre organisme, pour une formation précise, à une personne précise. Le faux se démasque immédiatement.",
  },
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
          { "@type": "ListItem", position: 2, name: "Anti-fraude", item: `${base}/anti-fraude` },
        ],
      },
      {
        "@type": "Service",
        name: "Vérification anti-fraude des titres de formation",
        serviceType: "Vérification d'authenticité des titres délivrés",
        description:
          "Chaque titre délivré via OFManager porte un numéro unique et un QR code, vérifiables en ligne par un tiers à partir du numéro et de la date de naissance du titulaire.",
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
      <ScrollReveal skip={1} />

      {/* HEADER */}
      <SiteHeader />

      {/* HERO */}
      <section className="text-white" style={{ background: `radial-gradient(1000px 600px at 85% -10%, rgba(18,184,134,.22), transparent 60%), linear-gradient(180deg, ${NAVY}, #12245A)` }}>
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-[#bff3df]">
              <ShieldCheck className="h-3.5 w-3.5" /> Vérification d&apos;authenticité
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl" style={{ fontFamily: "var(--font-sora)" }}>
              La fin des <span style={{ color: "#5EEAD4" }}>faux diplômes</span> et attestations
            </h1>
            <p className="mt-5 max-w-xl text-lg text-[#cddaf0]">
              Chaque titre que vous délivrez via OFManager porte un <strong className="text-white">numéro unique et un QR
              code</strong>. N&apos;importe qui — employeur, préfecture, client — peut en <strong className="text-white">vérifier
              l&apos;authenticité en ligne</strong>, en quelques secondes.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/verification" className="rounded-xl bg-[#12B886] px-6 py-3 font-semibold text-white hover:bg-[#0E9E73]">Vérifier un titre <ArrowRight className="inline h-4 w-4" /></Link>
              <Link href="/demo" className="rounded-xl border border-white/40 px-6 py-3 font-semibold hover:bg-white/10">Demander une démo</Link>
            </div>
          </div>

          {/* SIGNATURE : certificat vérifiable */}
          <div className="relative">
            <div className="rotate-[-1.5deg] rounded-2xl bg-white p-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Titre délivré</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#12B886]/12 px-2.5 py-1 text-[11px] font-bold text-[#0E9E73]"><BadgeCheck className="h-3.5 w-3.5" /> Authentique</span>
              </div>
              <div className="mt-4 flex gap-4">
                <div className="grid h-24 w-24 shrink-0 place-items-center rounded-xl border-2 border-[#0D1B3E]/10 bg-[#F5F8FD]" aria-hidden>
                  <QrCode className="h-16 w-16 text-[#0D1B3E]" strokeWidth={1.25} />
                </div>
                <div className="text-sm">
                  <div className="font-extrabold text-[#0D1B3E]" style={{ fontFamily: "var(--font-sora)" }}>SSIAP 1</div>
                  <div className="text-slate-500">Sécurité incendie</div>
                  <div className="mt-2 font-mono text-[13px] text-[#3B6EF5]">N° 92-2026-…-0473</div>
                  <div className="text-xs text-slate-400">Délivré par votre organisme</div>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-[#0D1B3E] px-3 py-2 text-center text-[11px] font-semibold text-[#bff3df]">
                Scannez le QR ou saisissez le n° pour vérifier
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 -z-0 h-24 w-24 rounded-full bg-[#12B886]/20 blur-2xl" aria-hidden />
          </div>
        </div>
      </section>

      {/* LE PROBLÈME */}
      <section className="bg-[#F5F8FD] py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>La fraude documentaire, un vrai risque</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
            Un diplôme se photoshoppe, une attestation de recyclage se falsifie, un document de centre s&apos;imite. Dans les
            métiers réglementés, c&apos;est loin d&apos;être anodin.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {[
              ["Pour votre organisme", "Un faux titre à votre nom qui circule, c'est votre réputation et votre responsabilité qui sont engagées."],
              ["Pour l'employeur", "Recruter un agent de sécurité sur une fausse carte ou un faux SSIAP, c'est un risque humain, légal et assurantiel."],
              ["Pour le candidat honnête", "Celui qui a réellement passé sa formation se retrouve noyé parmi des titres falsifiés."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="font-bold text-[#0D1B3E]" style={{ fontFamily: "var(--font-sora)" }}>{t}</h3>
                <p className="mt-2 text-sm text-slate-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Comment ça marche</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">Trois étapes, aucune installation, aucun compte pour celui qui vérifie.</p>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {[
            [<BadgeCheck key="i" className="h-7 w-7" />, "Vous délivrez le titre", "Dans OFManager, chaque titre délivré reçoit automatiquement un numéro de vérification unique et un QR code, imprimés sur le document."],
            [<QrCode key="i" className="h-7 w-7" />, "Le tiers scanne ou saisit", "L'employeur (ou la préfecture, le client…) scanne le QR — ou saisit le numéro — puis la date de naissance du titulaire."],
            [<Search key="i" className="h-7 w-7" />, "La vérification s'affiche", "La page publique confirme instantanément : titre authentique, délivré par votre organisme, pour cette formation — ou signale un titre inconnu."],
          ].map(([icon, t, d], i) => (
            <div key={t as string} className="relative text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-white" style={{ background: i === 2 ? GREEN : NAVY }}>{icon}</div>
              <div className="mt-2 text-xs font-bold text-[#3B6EF5]">ÉTAPE {i + 1}</div>
              <h3 className="mt-1 font-bold text-[#0D1B3E]" style={{ fontFamily: "var(--font-sora)" }}>{t}</h3>
              <p className="mt-2 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/verification" className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-white" style={{ background: GREEN }}>
            <ShieldCheck className="h-4 w-4" /> Essayer la vérification
          </Link>
          <p className="mt-3 text-xs text-slate-400">La double clé (numéro + date de naissance) protège la vie privée : impossible de fouiller la base.</p>
        </div>
      </section>

      {/* CE QUE ÇA PROTÈGE */}
      <section className="bg-[#F5F8FD] py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Un gage de confiance pour tous</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {[
              [<ShieldCheck key="i" className="h-6 w-6" />, "Votre organisme", "Vos titres deviennent une preuve de sérieux. Vous vous distinguez des officines qui vendent du papier."],
              [<Building2 key="i" className="h-6 w-6" />, "Les employeurs & donneurs d'ordre", "Ils recrutent et contractualisent en confiance, sur des titres vérifiés, pas sur des PDF."],
              [<UserCheck key="i" className="h-6 w-6" />, "Le candidat", "Son vrai titre est reconnaissable au premier coup d'œil — un avantage à l'embauche."],
            ].map(([icon, t, d]) => (
              <div key={t as string} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#3B6EF5]/10 text-[#3B6EF5]">{icon}</div>
                <h3 className="mt-3 font-bold text-[#0D1B3E]" style={{ fontFamily: "var(--font-sora)" }}>{t}</h3>
                <p className="mt-2 text-sm text-slate-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIFFÉRENCIATEUR (sans nommer de concurrent) */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Là où les outils génériques s&apos;arrêtent au PDF</h2>
        <p className="mx-auto mt-4 max-w-2xl text-slate-600">
          La plupart des logiciels de formation génèrent un document et s&apos;arrêtent là. OFManager va plus loin : il rend
          chaque titre <strong>vérifiable par un tiers</strong>. C&apos;est natif, inclus, et pensé pour les métiers réglementés
          où l&apos;authenticité d&apos;un titre engage la sécurité des personnes.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/fonctionnalites" className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-[#0D1B3E] hover:border-[#3B6EF5] hover:text-[#3B6EF5]">Voir toutes les fonctionnalités</Link>
          <Link href="/solutions/ssiap" className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-[#0D1B3E] hover:border-[#3B6EF5] hover:text-[#3B6EF5]">Cas de la sécurité (SSIAP)</Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <h2 className="text-center text-2xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Questions fréquentes</h2>
        <div className="mt-8 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-[#0D1B3E]" style={{ fontFamily: "var(--font-sora)" }}>{f.q}</summary>
              <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-white" style={{ background: `linear-gradient(135deg, ${GREEN}, ${NAVY})` }}>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold" style={{ fontFamily: "var(--font-sora)" }}>Délivrez des titres qu&apos;on ne peut pas falsifier</h2>
          <p className="mx-auto mt-3 max-w-md text-white/85">Voyez la vérification anti-fraude en action sur vos formations.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/demo" className="rounded-xl bg-white px-7 py-3 font-semibold text-[#0D1B3E] hover:bg-slate-100">Demander une démo <ArrowRight className="inline h-4 w-4" /></Link>
            <Link href="/verification" className="rounded-xl border border-white/50 px-7 py-3 font-semibold hover:bg-white/10">Vérifier un titre</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <SiteFooter />
    </main>
  );
}
