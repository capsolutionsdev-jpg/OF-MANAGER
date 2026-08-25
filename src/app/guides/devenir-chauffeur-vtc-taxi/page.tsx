// src/app/guides/devenir-chauffeur-vtc-taxi/page.tsx
// Pilier informationnel « Devenir chauffeur VTC ou taxi ». Server Component.
// FAITS uniquement — sources officielles en bas.
import type { Metadata } from "next";
import Link from "next/link";
import { getArticle, BLOG_BASE } from "@/lib/blog/registry";
import { BlogArticleShell, AnswerBox, FactBox, Callout, type Faq, type Source } from "@/components/blog/blog-shell";

const meta = getArticle("devenir-chauffeur-vtc-taxi")!;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: `${BLOG_BASE}/${meta.slug}` },
  openGraph: { title: meta.title, description: meta.description, url: `${BLOG_BASE}/${meta.slug}`, type: "article" },
};

const COMPARE: [string, string, string][] = [
  ["Statut", "Transporteur privé, sur réservation préalable uniquement", "Peut être hélé dans la rue et stationner sur la voie publique"],
  ["Carte professionnelle", "Carte VTC délivrée par la préfecture", "Carte de conducteur de taxi délivrée par la préfecture"],
  ["Examen", "Examen T3P (tronc commun + admission VTC), via la CMA", "Examen T3P (tronc commun + admission taxi, dont épreuve locale)"],
  ["Autorisation d'exploiter", "Inscription au registre VTC", "Autorisation de stationnement (ADS / « licence »), en plus de la carte"],
  ["Formation continue", "14 heures tous les 5 ans", "14 heures tous les 5 ans"],
];

const faqs: Faq[] = [
  {
    q: "Quelle est la différence entre VTC et taxi ?",
    a: "Le taxi peut être hélé dans la rue et stationner sur la voie publique grâce à une autorisation de stationnement (ADS). Le VTC travaille uniquement sur réservation préalable. Les deux relèvent du transport public particulier de personnes (T3P) et exigent une carte professionnelle délivrée par la préfecture après réussite d'un examen.",
  },
  {
    q: "Comment devenir chauffeur VTC ?",
    a: "Il faut remplir les conditions (permis B de plus de 3 ans, aptitude médicale, PSC1, casier compatible), réussir l'examen T3P organisé par les Chambres de Métiers et de l'Artisanat (tronc commun + épreuve VTC), puis demander sa carte professionnelle VTC à la préfecture et s'inscrire au registre VTC.",
  },
  {
    q: "Faut-il une formation obligatoire pour passer l'examen VTC ou taxi ?",
    a: "La formation initiale n'est pas juridiquement obligatoire : c'est la réussite à l'examen T3P qui conditionne la carte. En pratique, la plupart des candidats suivent une préparation en organisme de formation, éligible au CPF, pour maximiser leurs chances.",
  },
  {
    q: "Le chauffeur VTC ou taxi doit-il se former régulièrement ?",
    a: "Oui. Une formation continue obligatoire de 14 heures tous les 5 ans est nécessaire pour renouveler la carte professionnelle, pour les VTC comme pour les taxis.",
  },
  {
    q: "Peut-on financer la formation VTC ou taxi avec le CPF ?",
    a: "Oui. Les préparations aux examens taxi et VTC sont des certifications enregistrées au Répertoire spécifique, éligibles au CPF lorsqu'elles sont dispensées par un organisme certifié Qualiopi.",
  },
];

const sources: Source[] = [
  { label: "Service-Public.fr — Devenir chauffeur VTC", href: "https://www.service-public.fr/particuliers/vosdroits/F35434" },
  { label: "Service-Public.fr — Devenir chauffeur de taxi", href: "https://www.service-public.fr/particuliers/vosdroits/F2143" },
  { label: "CMA France — Examens taxi et VTC", href: "https://www.cmafrance.fr/" },
];

export default function Page() {
  return (
    <BlogArticleShell meta={meta} faqs={faqs} sources={sources}>
      <AnswerBox>
        Pour <strong>devenir chauffeur VTC ou taxi</strong>, il faut réunir les conditions (permis B de plus de 3 ans, aptitude
        médicale, PSC1, casier compatible), réussir l&apos;<strong>examen T3P</strong> organisé par les Chambres de Métiers et
        de l&apos;Artisanat, puis obtenir sa <strong>carte professionnelle</strong> auprès de la préfecture. Le taxi doit en
        plus disposer d&apos;une <strong>autorisation de stationnement (ADS)</strong> pour exploiter.
      </AnswerBox>

      <p>
        VTC et taxi sont deux métiers proches, réunis sous le régime du <strong>transport public particulier de personnes
        (T3P)</strong>, mais aux règles distinctes. Ce guide clarifie la différence, détaille les conditions communes, les
        étapes, l&apos;examen, et les obligations une fois en activité.
      </p>

      <h2>VTC ou taxi : quelle différence ?</h2>
      <AnswerBox>
        La différence tient au <strong>mode de prise en charge</strong> : le <strong>taxi</strong> peut être hélé dans la rue
        et stationner sur la voie publique (grâce à l&apos;ADS) ; le <strong>VTC</strong> travaille uniquement sur
        <strong> réservation préalable</strong>. Le reste du parcours (examen T3P, carte pro, formation continue) est très
        proche.
      </AnswerBox>
      <div className="my-7 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 text-[#0D1B3E]">
              <th className="py-2 pr-4 font-bold" style={{ fontFamily: "var(--font-sora)" }}></th>
              <th className="py-2 pr-4 font-bold" style={{ fontFamily: "var(--font-sora)" }}>VTC</th>
              <th className="py-2 font-bold" style={{ fontFamily: "var(--font-sora)" }}>Taxi</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE.map(([k, v, t]) => (
              <tr key={k} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-4 font-semibold text-[#0D1B3E]">{k}</td>
                <td className="py-3 pr-4 text-slate-600">{v}</td>
                <td className="py-3 text-slate-600">{t}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Les conditions communes (VTC et taxi)</h2>
      <FactBox
        title="Les prérequis principaux"
        items={[
          "Être titulaire du permis B en cours de validité, depuis plus de 3 ans (2 ans si conduite accompagnée)",
          "Réussir la visite médicale d'aptitude auprès d'un médecin agréé par la préfecture",
          "Détenir une attestation de premiers secours (PSC1)",
          "Un casier judiciaire (bulletin n° 2) compatible avec l'activité",
          "Réussir l'examen T3P correspondant (VTC ou taxi)",
        ]}
      />

      <h2>Les étapes pour devenir chauffeur</h2>
      <ol className="my-6 space-y-3">
        {[
          ["Vérifier votre éligibilité", "Permis B (plus de 3 ans), aptitude médicale, PSC1, casier compatible : réunissez les prérequis avant de vous lancer."],
          ["Vous préparer à l'examen", "La préparation n'est pas obligatoire mais fortement conseillée. Elle est souvent éligible au CPF via un organisme certifié Qualiopi."],
          ["Passer l'examen T3P (via la CMA)", "Un tronc commun (réglementation, gestion, sécurité routière, français, anglais) et une épreuve d'admission spécifique VTC ou taxi."],
          ["Demander votre carte professionnelle", "Après réussite, la préfecture délivre la carte de conducteur VTC ou de taxi, valable 5 ans."],
          ["Obtenir une ADS (taxi uniquement)", "Pour exploiter un taxi, il faut une autorisation de stationnement délivrée par la commune — ou être salarié / locataire d'un titulaire."],
          ["Renouveler par la formation continue", "Une formation continue de 14 heures tous les 5 ans est requise pour conserver la carte."],
        ].map(([t, d], i) => (
          <li key={t} className="grid grid-cols-[36px_1fr] gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#3B6EF5] text-sm font-extrabold text-white">{i + 1}</span>
            <span><strong>{t}.</strong> {d}</span>
          </li>
        ))}
      </ol>

      <h2>L&apos;examen T3P : ce qu&apos;il faut savoir</h2>
      <p>
        L&apos;examen est organisé par les <strong>Chambres de Métiers et de l&apos;Artisanat</strong>. Il comporte un
        <strong> tronc commun</strong> (réglementation du T3P, gestion, sécurité routière, français et anglais) et une
        <strong> épreuve d&apos;admission</strong> propre au métier visé. Pour le taxi, s&apos;ajoute une dimension locale
        (réglementation et connaissance du territoire du département d&apos;exercice).
      </p>

      <h2>Une fois en activité : la formation continue</h2>
      <AnswerBox>
        Chauffeur VTC comme taxi doivent suivre une <strong>formation continue obligatoire de 14 heures tous les 5 ans</strong>
        {" "}pour renouveler leur carte professionnelle. C&apos;est une échéance récurrente — à ne pas laisser passer sous peine
        de ne plus pouvoir exercer.
      </AnswerBox>
      <Callout>
        Vous formez des chauffeurs VTC ou taxi ? OFManager gère le <strong>parcours T3P</strong> de bout en bout (prérequis,
        calendrier des examens CMA, <strong>examens blancs</strong> VTC &amp; taxi intégrés) et relance automatiquement les
        formations continues avant l&apos;échéance. Voir <Link href="/solutions/vtc-taxi">la solution VTC / Taxi</Link> ou les{" "}
        <Link href="/fonctionnalites">fonctionnalités</Link>.
      </Callout>

      <h2>Comment financer sa formation VTC ou taxi ?</h2>
      <p>
        Les préparations aux examens VTC et taxi sont <strong>éligibles au CPF</strong>, et d&apos;autres financements existent
        selon votre statut (France Travail pour les demandeurs d&apos;emploi). Détails dans notre guide{" "}
        <Link href={`${BLOG_BASE}/financer-formation-cpf-opco-france-travail`}>financer une formation</Link>.
      </p>

      <h2>En résumé</h2>
      <p>
        VTC et taxi partagent le même socle : conditions d&apos;accès, examen T3P via la CMA, carte professionnelle de la
        préfecture et formation continue de 14 h / 5 ans. La grande différence est l&apos;<strong>ADS</strong>, qui distingue
        le taxi. Autre métier réglementé qui recrute ? Voyez comment{" "}
        <Link href={`${BLOG_BASE}/devenir-agent-de-securite-privee`}>devenir agent de sécurité privée</Link>.
      </p>
    </BlogArticleShell>
  );
}
