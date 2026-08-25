// src/app/guides/ouvrir-organisme-de-formation/page.tsx
// Pilier informationnel « Ouvrir un organisme de formation ». Server Component.
// FAITS RÉGLEMENTAIRES uniquement — sources officielles listées en bas.
import type { Metadata } from "next";
import Link from "next/link";
import { getArticle, BLOG_BASE } from "@/lib/blog/registry";
import { BlogArticleShell, AnswerBox, FactBox, Callout, type Faq, type Source } from "@/components/blog/blog-shell";

const meta = getArticle("ouvrir-organisme-de-formation")!;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: `${BLOG_BASE}/${meta.slug}` },
  openGraph: { title: meta.title, description: meta.description, url: `${BLOG_BASE}/${meta.slug}`, type: "article" },
};

const faqs: Faq[] = [
  {
    q: "Faut-il un diplôme pour ouvrir un organisme de formation ?",
    a: "Non. Aucun diplôme ni agrément préalable n'est exigé pour créer un organisme de formation en France. Il s'agit d'une déclaration d'activité, pas d'une autorisation. Vous devez en revanche justifier d'une première prestation de formation réelle (convention ou contrat + programme) pour déclencher la déclaration.",
  },
  {
    q: "Comment obtenir un numéro de déclaration d'activité (NDA) ?",
    a: "Vous déposez une déclaration d'activité auprès de la DREETS de votre région dans les 3 mois qui suivent la conclusion de votre première convention ou contrat de formation. Après instruction, la DREETS vous attribue un numéro de déclaration d'activité à 11 chiffres, à faire figurer sur vos documents.",
  },
  {
    q: "Le numéro de déclaration d'activité est-il un agrément de l'État ?",
    a: "Non. Le NDA n'est ni un agrément, ni un label, ni une caution qualité de l'État. Il est d'ailleurs interdit de le présenter comme tel. C'est un simple enregistrement administratif qui autorise l'exercice de l'activité de formation.",
  },
  {
    q: "Quelles sont les obligations d'un organisme de formation ?",
    a: "Un OF doit notamment : déposer chaque année son Bilan Pédagogique et Financier (BPF) avant le 31 mai, établir un règlement intérieur, informer les stagiaires (programme, CGV, règlement), tenir une comptabilité conforme, respecter le RGPD, et obtenir la certification Qualiopi s'il vise des financements publics ou mutualisés.",
  },
  {
    q: "Le numéro de déclaration d'activité peut-il devenir caduc ?",
    a: "Oui. La déclaration d'activité devient caduque lorsque le Bilan Pédagogique et Financier ne fait apparaître aucune activité de formation pendant deux années consécutives. Il faut alors redéposer une déclaration pour reprendre l'activité.",
  },
];

const sources: Source[] = [
  { label: "Ministère du Travail — Devenir organisme de formation (travail-emploi.gouv.fr)", href: "https://travail-emploi.gouv.fr/formation-professionnelle/acteurs-cadre-et-qualite-de-la-formation-professionnelle/article/les-obligations-des-organismes-de-formation" },
  { label: "Entreprendre.Service-Public.fr — Organisme de formation", href: "https://entreprendre.service-public.fr/vosdroits/F31148" },
  { label: "Mon Activité Formation — déclaration d'activité & BPF", href: "https://www.monactiviteformation.emploi.gouv.fr/" },
];

export default function Page() {
  return (
    <BlogArticleShell meta={meta} faqs={faqs} sources={sources}>
      <AnswerBox>
        Pour <strong>ouvrir un organisme de formation</strong>, aucun diplôme ni agrément n&apos;est requis. Il faut réaliser
        une première prestation de formation, puis <strong>déclarer son activité auprès de la DREETS dans les 3 mois</strong>,
        ce qui donne un <strong>numéro de déclaration d&apos;activité (NDA)</strong>. Pour accéder aux financements publics
        (CPF, OPCO…), il faut en plus obtenir la <strong>certification Qualiopi</strong>.
      </AnswerBox>

      <p>
        Le marché de la formation professionnelle est ouvert : il n&apos;y a pas de barrière à l&apos;entrée sous forme de
        diplôme obligatoire. Mais « déclaration simple » ne veut pas dire « sans obligations » — une fois lancé, un organisme
        de formation (OF) a des devoirs précis. Voici, étape par étape, comment créer votre OF et ce qui vous attend ensuite.
      </p>

      <h2>Qu&apos;est-ce qu&apos;un organisme de formation ?</h2>
      <p>
        Un organisme de formation est une <strong>personne physique ou morale</strong> qui réalise des prestations de
        formation professionnelle. Dès qu&apos;une structure dispense une action de formation contre rémunération, elle entre
        dans le champ de la <strong>6<sup>e</sup> partie du Code du travail</strong> et doit se déclarer. Cela vaut aussi bien
        pour un formateur indépendant que pour une société.
      </p>

      <h2>Faut-il un diplôme ou un agrément pour ouvrir un OF ?</h2>
      <AnswerBox>
        <strong>Non.</strong> Créer un organisme de formation relève d&apos;une <strong>déclaration</strong>, pas d&apos;une
        autorisation. Aucun diplôme, aucun agrément préalable de l&apos;État n&apos;est exigé. Ce qui compte, c&apos;est
        d&apos;avoir une <strong>première prestation réelle</strong> (convention ou contrat + programme) pour déclencher la
        déclaration d&apos;activité.
      </AnswerBox>

      <h2>Les étapes pour créer un organisme de formation</h2>
      <ol className="my-6 space-y-3">
        {[
          ["Créer votre structure juridique", "Micro-entreprise, entreprise individuelle ou société : choisissez la forme adaptée à votre projet et immatriculez-la."],
          ["Réaliser une première action de formation", "Concluez votre première convention (client entreprise) ou contrat (particulier), avec un programme et des objectifs définis."],
          ["Déclarer l'activité à la DREETS (sous 3 mois)", "Déposez la déclaration d'activité auprès de la DREETS de votre région dans les 3 mois suivant cette première prestation. Vous recevez votre NDA à 11 chiffres."],
          ["Vous mettre en conformité", "Règlement intérieur, information des stagiaires, CGV, comptabilité conforme, respect du RGPD : les obligations d'un OF s'appliquent dès le premier stagiaire."],
          ["Obtenir Qualiopi si vous visez des fonds publics", "Pour que vos clients mobilisent le CPF, un OPCO ou France Travail, la certification Qualiopi est indispensable."],
          ["Déposer le BPF chaque année", "Le Bilan Pédagogique et Financier se déclare avant le 31 mai, même en l'absence d'activité, sous peine de caducité de votre déclaration."],
        ].map(([t, d], i) => (
          <li key={t} className="grid grid-cols-[36px_1fr] gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#3B6EF5] text-sm font-extrabold text-white">{i + 1}</span>
            <span><strong>{t}.</strong> {d}</span>
          </li>
        ))}
      </ol>

      <h2>Le numéro de déclaration d&apos;activité (NDA) : ce qu&apos;il faut savoir</h2>
      <AnswerBox>
        Le NDA est un <strong>numéro à 11 chiffres</strong> attribué par la DREETS. Ce n&apos;est <strong>ni un agrément ni un
        label qualité</strong> : le présenter comme une caution de l&apos;État est interdit. Il doit figurer sur vos
        conventions et documents, et devient <strong>caduc</strong> si aucune activité n&apos;est déclarée deux années de suite.
      </AnswerBox>
      <p>
        Attention à une confusion fréquente : le NDA <strong>autorise</strong> à exercer, mais n&apos;ouvre <strong>pas</strong>
        {" "}droit aux financements publics. C&apos;est la <Link href={`${BLOG_BASE}/certification-qualiopi-guide`}>certification
        Qualiopi</Link> qui joue ce rôle. Les deux sont distincts et complémentaires.
      </p>

      <h2>Quelles obligations une fois l&apos;OF créé ?</h2>
      <FactBox
        title="Vos obligations principales d'organisme de formation"
        items={[
          "Bilan Pédagogique et Financier (BPF) déposé chaque année avant le 31 mai",
          "Règlement intérieur applicable aux stagiaires",
          "Information des stagiaires : programme, objectifs, CGV, modalités",
          "Comptabilité conforme retraçant l'activité de formation",
          "Respect du RGPD pour les données des stagiaires",
          "Certification Qualiopi si financements publics ou mutualisés visés",
        ]}
      />
      <p>
        Ces obligations sont permanentes et cumulatives. Elles constituent d&apos;ailleurs le socle de preuves que vérifiera un
        audit Qualiopi — d&apos;où l&apos;intérêt de <strong>structurer votre organisation dès le départ</strong> plutôt que de
        tout reconstituer plus tard.
      </p>

      <h2>Le cas des OF réglementés : sécurité privée et VTC/Taxi</h2>
      <p>
        Certains métiers ajoutent une couche de réglementation par-dessus le statut d&apos;OF. En <strong>sécurité
        privée</strong>, les formations (TFP APS, SSIAP…) relèvent aussi du CNAPS et de prérequis stricts (autorisation
        préalable, carte professionnelle, aptitude). En <strong>transport de personnes</strong> (VTC, taxi), le parcours T3P
        impose ses propres conditions. Pour ces organismes, la difficulté n&apos;est pas seulement administrative : c&apos;est
        de <strong>tracer des prérequis et des certifications réglementées</strong> sans erreur.
      </p>
      <Callout>
        <strong>OFManager</strong> est pensé pour ces OF réglementés : formations sécurité et transport préconfigurées avec
        leurs prérequis, inscriptions, sessions, émargement, Qualiopi et BPF réunis dans un seul outil — plus la{" "}
        <strong>vérification anti-fraude publique</strong> des titres délivrés. Découvrez les{" "}
        <Link href="/fonctionnalites">fonctionnalités</Link> ou demandez une <Link href="/demo">démo</Link>.
      </Callout>

      <h2>En résumé</h2>
      <p>
        Ouvrir un organisme de formation est accessible : une déclaration à la DREETS dans les 3 mois de votre première
        prestation suffit à obtenir votre NDA, sans diplôme ni agrément. La vraie exigence vient <strong>après</strong> :
        BPF annuel, obligations d&apos;information et de conformité, et <Link href={`${BLOG_BASE}/certification-qualiopi-guide`}>certification
        Qualiopi</Link> dès que vous visez des financements publics. Bien s&apos;outiller dès le lancement évite de subir ces
        obligations.
      </p>
    </BlogArticleShell>
  );
}
