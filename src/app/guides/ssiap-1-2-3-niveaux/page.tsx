// src/app/guides/ssiap-1-2-3-niveaux/page.tsx
// Pilier informationnel « SSIAP 1, 2, 3 ». Server Component.
// FAITS uniquement (arrêté du 2 mai 2005) — durées prudentes, sources en bas.
import type { Metadata } from "next";
import Link from "next/link";
import { getArticle, BLOG_BASE } from "@/lib/blog/registry";
import { BlogArticleShell, AnswerBox, FactBox, Callout, type Faq, type Source } from "@/components/blog/blog-shell";

const meta = getArticle("ssiap-1-2-3-niveaux")!;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: `${BLOG_BASE}/${meta.slug}` },
  openGraph: { title: meta.title, description: meta.description, url: `${BLOG_BASE}/${meta.slug}`, type: "article" },
};

const NIVEAUX: [string, string, string][] = [
  ["SSIAP 1", "Agent de sécurité incendie", "Prévention, alerte, évacuation, entretien des moyens de secours, assistance à personnes."],
  ["SSIAP 2", "Chef d'équipe", "Encadre l'équipe d'agents, tient le poste de sécurité, forme le personnel de l'établissement."],
  ["SSIAP 3", "Chef de service", "Dirige le service de sécurité incendie, conseille le chef d'établissement, gère budget, formation et documents."],
];

const faqs: Faq[] = [
  {
    q: "Quelle est la différence entre SSIAP 1, 2 et 3 ?",
    a: "Le SSIAP 1 est l'agent de sécurité incendie sur le terrain. Le SSIAP 2 est le chef d'équipe qui encadre les agents et tient le poste de sécurité. Le SSIAP 3 est le chef de service qui dirige l'ensemble du service de sécurité incendie et conseille le chef d'établissement. Chaque niveau suppose le précédent et davantage de responsabilités.",
  },
  {
    q: "Quels sont les prérequis pour passer le SSIAP 1 ?",
    a: "Pour accéder à la formation SSIAP 1, il faut une aptitude médicale récente et une attestation de secourisme en cours de validité (SST ou PSE1 selon les cas). Le SSIAP 1 est le niveau d'entrée : il ne nécessite pas de diplôme préalable, contrairement aux niveaux 2 et 3.",
  },
  {
    q: "Faut-il recycler son SSIAP ?",
    a: "Oui. Chaque niveau SSIAP impose un recyclage tous les 3 ans pour maintenir la qualification. En cas d'interruption d'activité de plus de 3 ans, une remise à niveau est nécessaire avant de pouvoir exercer de nouveau.",
  },
  {
    q: "Le SSIAP est-il obligatoire pour travailler dans un ERP ?",
    a: "Oui, pour les missions de sécurité incendie dans les établissements recevant du public (ERP) et les immeubles de grande hauteur (IGH) concernés, la qualification SSIAP du niveau adapté est exigée. Elle est encadrée par l'arrêté du 2 mai 2005.",
  },
  {
    q: "Peut-on passer directement le SSIAP 2 ou le SSIAP 3 ?",
    a: "Non, la progression est graduelle. Le SSIAP 2 exige d'être titulaire du SSIAP 1 et de justifier d'une expérience (ou d'un diplôme équivalent). Le SSIAP 3 exige le SSIAP 2 et une expérience de chef d'équipe (ou un diplôme de niveau adapté). Aptitude médicale et secourisme à jour sont requis à chaque niveau.",
  },
];

const sources: Source[] = [
  { label: "Légifrance — Arrêté du 2 mai 2005 (missions, emploi et qualification SSIAP)", href: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000606016/" },
  { label: "Service-Public.fr — Sécurité incendie dans les ERP", href: "https://www.service-public.fr/particuliers/vosdroits/F32351" },
];

export default function Page() {
  return (
    <BlogArticleShell meta={meta} faqs={faqs} sources={sources}>
      <AnswerBox>
        Le <strong>SSIAP</strong> (Service de Sécurité Incendie et d&apos;Assistance à Personnes) qualifie les agents de
        sécurité incendie dans les <strong>ERP et IGH</strong>. Il comporte <strong>trois niveaux</strong> : SSIAP 1
        (l&apos;agent), SSIAP 2 (le chef d&apos;équipe) et SSIAP 3 (le chef de service). Chaque niveau se recycle tous les
        <strong> 3 ans</strong>.
      </AnswerBox>

      <p>
        Derrière le sigle SSIAP se cache une hiérarchie de compétences bien précise, encadrée par l&apos;<strong>arrêté du
        2 mai 2005</strong>. Que vous soyez candidat ou <Link href={`${BLOG_BASE}/devenir-agent-de-securite-privee`}>déjà agent
        de sécurité</Link> qui veut se spécialiser, ce guide clarifie les rôles, les prérequis et les recyclages de chaque
        niveau.
      </p>

      <h2>Qu&apos;est-ce que le SSIAP ?</h2>
      <p>
        Le SSIAP désigne à la fois un <strong>service</strong> (le service de sécurité incendie d&apos;un établissement) et les
        <strong> qualifications</strong> des personnes qui le composent. Il concerne les <strong>établissements recevant du
        public (ERP)</strong> et les <strong>immeubles de grande hauteur (IGH)</strong>, où la prévention et la lutte contre
        l&apos;incendie sont réglementées. Ces missions ne peuvent être confiées qu&apos;à du personnel qualifié SSIAP.
      </p>

      <h2>SSIAP 1, 2, 3 : quelle différence ?</h2>
      <AnswerBox>
        La différence est une question de <strong>responsabilité croissante</strong> : le SSIAP 1 agit sur le terrain, le
        SSIAP 2 encadre l&apos;équipe, le SSIAP 3 dirige le service et conseille la direction. Chaque niveau suppose d&apos;être
        titulaire du précédent.
      </AnswerBox>
      <div className="my-7 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 text-[#0D1B3E]">
              <th className="py-2 pr-4 font-bold" style={{ fontFamily: "var(--font-sora)" }}>Niveau</th>
              <th className="py-2 pr-4 font-bold" style={{ fontFamily: "var(--font-sora)" }}>Rôle</th>
              <th className="py-2 font-bold" style={{ fontFamily: "var(--font-sora)" }}>Missions</th>
            </tr>
          </thead>
          <tbody>
            {NIVEAUX.map(([n, r, m]) => (
              <tr key={n} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-4 font-semibold text-[#0D1B3E]">{n}</td>
                <td className="py-3 pr-4 text-slate-700">{r}</td>
                <td className="py-3 text-slate-600">{m}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>SSIAP 1 — l&apos;agent de sécurité incendie</h2>
      <p>
        C&apos;est le niveau d&apos;entrée. L&apos;agent SSIAP 1 assure les rondes, la prévention des risques, l&apos;alerte et
        l&apos;évacuation, l&apos;entretien élémentaire des moyens de secours et l&apos;assistance à personnes. L&apos;accès à
        la formation demande une <strong>aptitude médicale</strong> et une <strong>attestation de secourisme</strong> à jour —
        mais aucun diplôme préalable.
      </p>

      <h2>SSIAP 2 — le chef d&apos;équipe</h2>
      <p>
        Le SSIAP 2 encadre une équipe d&apos;agents, tient le poste central de sécurité et participe à la formation du
        personnel. Il faut être <strong>titulaire du SSIAP 1</strong> et justifier d&apos;une <strong>expérience</strong>
        (ou d&apos;un diplôme équivalent), avec aptitude médicale et secourisme en cours de validité.
      </p>

      <h2>SSIAP 3 — le chef de service</h2>
      <p>
        Le SSIAP 3 dirige l&apos;ensemble du service de sécurité incendie : management, budget, formation, documents et
        conseil au chef d&apos;établissement. Il exige le <strong>SSIAP 2</strong>, une expérience de chef d&apos;équipe (ou un
        diplôme de niveau adapté), l&apos;aptitude médicale et le secourisme à jour.
      </p>

      <h2>Le recyclage SSIAP</h2>
      <FactBox
        title="Maintenir sa qualification"
        items={[
          "Recyclage obligatoire tous les 3 ans, à chaque niveau",
          "Remise à niveau exigée après une interruption d'activité de plus de 3 ans",
          "Aptitude médicale et secourisme (SST / PSE1) à tenir à jour en permanence",
        ]}
      />
      <p>
        Le suivi de ces échéances est un enjeu réel pour un centre de formation comme pour l&apos;agent : une qualification
        périmée, c&apos;est l&apos;impossibilité d&apos;exercer.
      </p>

      <Callout>
        Vous formez au SSIAP ? <strong>OFManager</strong> intègre les jurys et grilles de certification SSIAP, des
        <strong> examens blancs SSIAP</strong> prêts à l&apos;emploi, et relance automatiquement chaque recyclage avant
        l&apos;échéance. Voir <Link href="/solutions/ssiap">la solution SSIAP</Link> ou l&apos;ensemble des{" "}
        <Link href="/fonctionnalites">fonctionnalités</Link>.
      </Callout>

      <h2>En résumé</h2>
      <p>
        SSIAP 1, 2 et 3 forment une échelle claire : agent, chef d&apos;équipe, chef de service. On progresse d&apos;un niveau
        à l&apos;autre par l&apos;expérience et la formation, et l&apos;on entretient sa qualification par un recyclage
        triennal. Pour le cadre général du métier, voyez notre guide{" "}
        <Link href={`${BLOG_BASE}/devenir-agent-de-securite-privee`}>devenir agent de sécurité privée</Link>.
      </p>
    </BlogArticleShell>
  );
}
