// src/app/guides/devenir-agent-de-securite-privee/page.tsx
// Pilier informationnel « Devenir agent de sécurité privée ». Server Component.
// FAITS uniquement — durées prudentes, sources officielles en bas.
import type { Metadata } from "next";
import Link from "next/link";
import { getArticle, BLOG_BASE } from "@/lib/blog/registry";
import { BlogArticleShell, AnswerBox, FactBox, Callout, type Faq, type Source } from "@/components/blog/blog-shell";

const meta = getArticle("devenir-agent-de-securite-privee")!;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: `${BLOG_BASE}/${meta.slug}` },
  openGraph: { title: meta.title, description: meta.description, url: `${BLOG_BASE}/${meta.slug}`, type: "article" },
};

const faqs: Faq[] = [
  {
    q: "Quel diplôme faut-il pour devenir agent de sécurité ?",
    a: "Il n'y a pas de diplôme au sens scolaire, mais une qualification obligatoire : le TFP APS (Titre à Finalité Professionnelle Agent de Prévention et de Sécurité), qui donne accès à la carte professionnelle délivrée par le CNAPS. Avant même d'entrer en formation, il faut obtenir une autorisation préalable du CNAPS.",
  },
  {
    q: "Qu'est-ce que la carte professionnelle CNAPS ?",
    a: "C'est l'autorisation d'exercer un métier de la sécurité privée, délivrée par le CNAPS (Conseil National des Activités Privées de Sécurité). Elle est obligatoire pour travailler comme agent, valable 5 ans, et son renouvellement suppose d'avoir suivi le recyclage MAC APS.",
  },
  {
    q: "Combien de temps dure la formation d'agent de sécurité ?",
    a: "La formation initiale au TFP APS représente de l'ordre de 175 heures, réparties sur plusieurs semaines, alternant enseignements réglementaires, gestion des risques, secourisme et mises en situation. La durée exacte dépend de l'organisme et du rythme choisi.",
  },
  {
    q: "Faut-il repasser une formation pour garder sa carte ?",
    a: "Oui. La carte professionnelle est valable 5 ans. Pour la renouveler, l'agent doit suivre un recyclage : le MAC APS (Maintien et Actualisation des Compétences), qui remet à niveau les gestes métier, le secourisme et le cadre légal.",
  },
  {
    q: "Peut-on financer la formation TFP APS avec le CPF ?",
    a: "Oui, le TFP APS est une certification enregistrée, éligible au CPF lorsqu'elle est dispensée par un organisme certifié Qualiopi. D'autres financements sont possibles selon le statut (France Travail pour les demandeurs d'emploi, par exemple).",
  },
];

const sources: Source[] = [
  { label: "CNAPS — Conseil National des Activités Privées de Sécurité", href: "https://www.cnaps.interieur.gouv.fr/" },
  { label: "Service-Public.fr — Carte professionnelle d'agent de sécurité privée", href: "https://www.service-public.fr/particuliers/vosdroits/F32541" },
  { label: "France compétences — Répertoire national des certifications professionnelles (RNCP)", href: "https://www.francecompetences.fr/recherche_certificationprofessionnelle/" },
];

export default function Page() {
  return (
    <BlogArticleShell meta={meta} faqs={faqs} sources={sources}>
      <AnswerBox>
        Pour <strong>devenir agent de sécurité privée</strong>, il faut une <strong>carte professionnelle délivrée par le
        CNAPS</strong>. Le parcours : obtenir une <strong>autorisation préalable</strong> du CNAPS, suivre la formation
        {" "}<strong>TFP APS</strong> (environ 175 heures), puis demander sa carte (valable 5 ans). Elle se renouvelle après un
        recyclage <strong>MAC APS</strong>. Aucun diplôme scolaire n&apos;est requis.
      </AnswerBox>

      <p>
        La sécurité privée est un secteur qui recrute, mais strictement encadré par le <strong>Code de la sécurité
        intérieure</strong> et contrôlé par le CNAPS. On n&apos;y entre pas sans qualification. Voici le parcours complet, de
        l&apos;autorisation préalable à la carte professionnelle, puis les spécialisations possibles.
      </p>

      <h2>Faut-il un diplôme pour devenir agent de sécurité ?</h2>
      <AnswerBox>
        <strong>Non, pas de diplôme scolaire</strong> — mais une <strong>qualification obligatoire</strong> : le TFP APS.
        C&apos;est lui qui ouvre l&apos;accès à la carte professionnelle. Et avant même la formation, il faut être jugé
        « moralement » apte via l&apos;<strong>autorisation préalable</strong> du CNAPS (vérification du comportement et des
        antécédents).
      </AnswerBox>

      <h2>Les conditions pour entrer dans la sécurité privée</h2>
      <FactBox
        title="Les prérequis principaux"
        items={[
          "Être majeur",
          "Être ressortissant de l'Union européenne ou titulaire d'un titre de séjour autorisant à travailler",
          "Un comportement et des antécédents compatibles avec l'exercice (contrôle de moralité par le CNAPS)",
          "Une maîtrise suffisante du français",
          "L'autorisation préalable ou provisoire du CNAPS avant d'entrer en formation",
        ]}
      />

      <h2>Les étapes pour devenir agent de sécurité</h2>
      <ol className="my-6 space-y-3">
        {[
          ["Demander l'autorisation préalable au CNAPS", "Avant toute formation, le CNAPS vérifie votre moralité et vous délivre une autorisation préalable (ou provisoire) d'entrée en formation."],
          ["Suivre la formation TFP APS", "Environ 175 heures : cadre légal, gestion des conflits et des risques, secourisme, incendie, mises en situation professionnelle."],
          ["Obtenir votre certification", "À l'issue des épreuves, vous obtenez le TFP APS, certification reconnue et enregistrée."],
          ["Demander la carte professionnelle", "Muni du TFP APS, vous demandez au CNAPS votre carte professionnelle, valable 5 ans, qui autorise l'exercice."],
          ["Exercer et vous spécialiser", "Vous pouvez travailler comme agent, puis vous spécialiser (incendie SSIAP, cynophile, sûreté aéroportuaire…)."],
          ["Suivre le recyclage MAC APS", "Avant l'échéance des 5 ans, le MAC APS remet à niveau vos compétences et conditionne le renouvellement de la carte."],
        ].map(([t, d], i) => (
          <li key={t} className="grid grid-cols-[36px_1fr] gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#3B6EF5] text-sm font-extrabold text-white">{i + 1}</span>
            <span><strong>{t}.</strong> {d}</span>
          </li>
        ))}
      </ol>

      <h2>Se spécialiser : SSIAP, cynophile, sûreté…</h2>
      <p>
        Le TFP APS est la porte d&apos;entrée. Ensuite, plusieurs spécialisations ouvrent d&apos;autres missions et souvent une
        meilleure rémunération : le <strong>SSIAP</strong> (sécurité incendie en ERP et IGH, niveaux 1 à 3), l&apos;agent
        <strong> cynophile</strong> (maître-chien), la <strong>sûreté aéroportuaire</strong>, ou la protection physique de
        personnes. Chacune a sa propre formation et, pour certaines, son propre recyclage.
      </p>
      <Callout>
        Vous êtes un <strong>organisme de formation en sécurité privée</strong> ? OFManager préconfigure vos formations
        {" "}(<Link href="/solutions/tfp-aps">TFP APS</Link>, <Link href="/solutions/ssiap">SSIAP</Link>…) avec leurs
        prérequis CNAPS, gère les jurys, les recyclages MAC, et propose la <strong>vérification anti-fraude</strong> des titres
        délivrés. Voir les <Link href="/fonctionnalites">fonctionnalités</Link> ou demandez une <Link href="/demo">démo</Link>.
      </Callout>

      <h2>Combien coûte la formation et comment la financer ?</h2>
      <p>
        Le coût varie selon l&apos;organisme et la spécialisation. Bonne nouvelle : le TFP APS est <strong>éligible au
        CPF</strong> et à d&apos;autres financements selon votre statut. Pour tout comprendre, lisez notre guide{" "}
        <Link href={`${BLOG_BASE}/financer-formation-cpf-opco-france-travail`}>financer une formation</Link>.
      </p>

      <h2>En résumé</h2>
      <p>
        Devenir agent de sécurité privée, c&apos;est un parcours balisé par le CNAPS : autorisation préalable, TFP APS
        (~175 h), carte professionnelle valable 5 ans, puis recyclage MAC APS. Sans diplôme scolaire, mais avec une
        qualification et un contrôle de moralité incontournables. Métier voisin ? Voyez aussi comment{" "}
        <Link href={`${BLOG_BASE}/devenir-chauffeur-vtc-taxi`}>devenir chauffeur VTC ou taxi</Link>.
      </p>
    </BlogArticleShell>
  );
}
