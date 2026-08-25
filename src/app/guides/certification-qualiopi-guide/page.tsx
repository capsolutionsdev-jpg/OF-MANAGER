// src/app/guides/certification-qualiopi-guide/page.tsx
// Pilier informationnel « Certification Qualiopi ». Server Component.
// FAITS RÉGLEMENTAIRES uniquement — sources officielles listées en bas.
import type { Metadata } from "next";
import Link from "next/link";
import { getArticle, BLOG_BASE } from "@/lib/blog/registry";
import { BlogArticleShell, AnswerBox, FactBox, Callout, type Faq, type Source } from "@/components/blog/blog-shell";

const meta = getArticle("certification-qualiopi-guide")!;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: `${BLOG_BASE}/${meta.slug}` },
  openGraph: { title: meta.title, description: meta.description, url: `${BLOG_BASE}/${meta.slug}`, type: "article" },
};

const CRITERES: [string, string][] = [
  ["1. Information du public", "Des informations claires et vérifiables sur les prestations, délais, tarifs et résultats obtenus."],
  ["2. Objectifs & adaptation", "Des objectifs précis, adaptés aux publics et aux besoins, avec des prestations conçues en conséquence."],
  ["3. Accueil & accompagnement", "L'adaptation aux publics (dont situations de handicap), l'accueil, le suivi et l'évaluation des acquis."],
  ["4. Moyens pédagogiques", "Des moyens humains, techniques et un encadrement adaptés aux prestations."],
  ["5. Compétences des intervenants", "La qualification et le développement continu des compétences des formateurs et personnels."],
  ["6. Ancrage dans l'environnement", "L'inscription dans l'environnement professionnel : veille légale, sectorielle, réseaux, insertion."],
  ["7. Amélioration continue", "Le recueil des appréciations et le traitement des réclamations pour améliorer les prestations en continu."],
];

const faqs: Faq[] = [
  {
    q: "La certification Qualiopi est-elle obligatoire ?",
    a: "Qualiopi est obligatoire pour tout organisme qui veut faire financer ses formations par des fonds publics ou mutualisés : CPF, OPCO, France Travail, État, régions, Agefiph ou la Caisse des dépôts. Un organisme financé uniquement par ses clients (entreprises, particuliers en autofinancement) n'y est pas contraint, mais se prive de ces financements.",
  },
  {
    q: "Combien coûte la certification Qualiopi ?",
    a: "Le coût dépend de l'organisme certificateur choisi et de la taille de votre structure : il correspond au prix de l'audit (initial, de surveillance et de renouvellement). Les tarifs sont fixés librement par chaque certificateur accrédité — demandez plusieurs devis. À ce coût s'ajoute le temps de préparation des preuves.",
  },
  {
    q: "Combien de temps la certification Qualiopi est-elle valable ?",
    a: "La certification est délivrée pour 3 ans. Un audit de surveillance a lieu en cours de cycle (généralement entre le 14e et le 22e mois), puis un audit de renouvellement avant l'échéance des 3 ans pour repartir sur un nouveau cycle.",
  },
  {
    q: "Quelle est la différence entre Qualiopi et le numéro de déclaration d'activité (NDA) ?",
    a: "Le NDA est une simple déclaration administrative à la DREETS qui autorise à exercer une activité de formation. Qualiopi est une certification qualité, distincte et complémentaire, exigée uniquement pour accéder aux financements publics et mutualisés. On peut avoir un NDA sans Qualiopi, mais pas l'inverse dans la pratique.",
  },
  {
    q: "Qui délivre la certification Qualiopi ?",
    a: "Un organisme certificateur accrédité par le COFRAC (ou autorisé par France compétences), et non l'État directement. C'est lui qui réalise l'audit sur la base du Référentiel National Qualité et délivre le certificat. La liste des certificateurs est publiée par France compétences.",
  },
];

const sources: Source[] = [
  { label: "Ministère du Travail — La certification Qualiopi (travail-emploi.gouv.fr)", href: "https://travail-emploi.gouv.fr/formation-professionnelle/acteurs-cadre-et-qualite-de-la-formation-professionnelle/article/qualiopi-marque-de-certification-qualite-des-prestataires-de-formation" },
  { label: "France compétences — Le Référentiel National Qualité", href: "https://www.francecompetences.fr/" },
  { label: "Mon Activité Formation — téléservice des organismes de formation", href: "https://www.monactiviteformation.emploi.gouv.fr/" },
];

export default function Page() {
  return (
    <BlogArticleShell meta={meta} faqs={faqs} sources={sources}>
      <AnswerBox>
        <strong>La certification Qualiopi</strong> atteste de la qualité du processus d&apos;un organisme de formation.
        Obligatoire depuis le 1<sup>er</sup> janvier 2022 pour accéder aux <strong>fonds publics et mutualisés</strong>
        {" "}(CPF, OPCO, France Travail…), elle repose sur le <strong>Référentiel National Qualité</strong> : 7 critères
        et 32 indicateurs, vérifiés par un organisme certificateur accrédité, pour un cycle de 3 ans.
      </AnswerBox>

      <p>
        Que vous soyez en train de <Link href={`${BLOG_BASE}/ouvrir-organisme-de-formation`}>créer votre organisme de formation</Link> ou
        déjà en activité, Qualiopi conditionne l&apos;accès à l&apos;essentiel des financements. Ce guide répond aux questions
        que se posent les organismes : à quoi sert la certification, ce qu&apos;elle exige, comment l&apos;obtenir, son prix,
        ses délais — et comment aborder l&apos;audit sereinement.
      </p>

      <h2>Qu&apos;est-ce que la certification Qualiopi ?</h2>
      <p>
        Qualiopi est la <strong>marque de certification qualité</strong> des prestataires d&apos;actions concourant au
        développement des compétences. Elle ne certifie pas le contenu de vos formations, mais la <strong>qualité de vos
        processus</strong> : information du public, conception des prestations, accompagnement, moyens, compétences des
        intervenants et amélioration continue. Elle est délivrée par un <strong>organisme certificateur accrédité par le
        COFRAC</strong>, sur la base d&apos;un référentiel unique et national.
      </p>
      <p>
        Elle concerne quatre catégories d&apos;actions : les <strong>actions de formation</strong>, les <strong>bilans de
        compétences</strong>, la <strong>validation des acquis de l&apos;expérience (VAE)</strong> et les <strong>actions de
        formation par apprentissage</strong> (CFA).
      </p>

      <h2>La certification Qualiopi est-elle obligatoire ?</h2>
      <AnswerBox>
        Qualiopi est <strong>obligatoire pour faire financer vos formations par des fonds publics ou mutualisés</strong>.
        Sans elle, vos clients ne peuvent pas mobiliser leur CPF, ni un financement OPCO, France Travail, région ou État.
        Elle reste facultative si vous êtes financé uniquement par vos clients en direct.
      </AnswerBox>
      <FactBox
        title="Financements qui exigent Qualiopi"
        items={[
          "CPF — Compte Personnel de Formation (via Mon Compte Formation)",
          "OPCO — Opérateurs de compétences (financement des entreprises)",
          "France Travail (ex-Pôle emploi) — demandeurs d'emploi",
          "État, régions et collectivités",
          "Agefiph — formation des personnes en situation de handicap",
          "Caisse des dépôts et consignations",
        ]}
      />
      <p>
        Autrement dit : si un seul de vos financeurs figure dans cette liste, Qualiopi n&apos;est pas une option. C&apos;est
        la raison pour laquelle la quasi-totalité des organismes qui visent le marché de la formation financée passent la
        certification.
      </p>

      <h2>Les 7 critères et 32 indicateurs du Référentiel National Qualité</h2>
      <AnswerBox>
        Le Référentiel National Qualité (RNQ) structure Qualiopi en <strong>7 critères</strong> déclinés en
        {" "}<strong>32 indicateurs</strong>. Certains indicateurs sont spécifiques à une activité (apprentissage, VAE…) :
        vous n&apos;êtes audité que sur ceux qui s&apos;appliquent à vos prestations. Chaque indicateur doit être
        <strong> prouvé</strong> par des éléments concrets présentés à l&apos;auditeur.
      </AnswerBox>
      <div className="my-7 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 text-[#0D1B3E]">
              <th className="py-2 pr-4 font-bold" style={{ fontFamily: "var(--font-sora)" }}>Critère</th>
              <th className="py-2 font-bold" style={{ fontFamily: "var(--font-sora)" }}>Ce qu&apos;il vérifie</th>
            </tr>
          </thead>
          <tbody>
            {CRITERES.map(([t, d]) => (
              <tr key={t} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-4 font-semibold text-[#0D1B3E]">{t}</td>
                <td className="py-3 text-slate-600">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        La logique du référentiel est celle de la <strong>preuve</strong> : pour chaque indicateur applicable, l&apos;auditeur
        attend un élément tangible (procédure, document, trace d&apos;action). C&apos;est là que la préparation se joue —
        nous y revenons plus bas.
      </p>

      <h2>Comment obtenir la certification Qualiopi ? Les étapes</h2>
      <AnswerBox>
        Pour obtenir Qualiopi : choisissez un <strong>organisme certificateur accrédité</strong>, préparez vos preuves pour
        chaque indicateur applicable, passez l&apos;<strong>audit initial</strong>, puis maintenez la certification via un
        <strong> audit de surveillance</strong> (14–22 mois) et un <strong>audit de renouvellement</strong> avant la fin des
        3 ans.
      </AnswerBox>
      <ol className="my-6 space-y-3">
        {[
          ["Choisir un organisme certificateur accrédité", "Sélectionnez un certificateur dans la liste publiée par France compétences, et demandez plusieurs devis (les tarifs sont libres)."],
          ["Préparer les preuves", "Constituez, pour chaque indicateur applicable, les éléments de preuve : procédures, modèles de documents, traces d'émargement, évaluations, registres."],
          ["Passer l'audit initial", "L'auditeur vérifie sur site ou à distance la conformité au référentiel. À l'issue, il conclut sur la délivrance de la certification."],
          ["Obtenir le certificat (3 ans)", "La certification est délivrée pour un cycle de 3 ans, sous réserve du traitement des éventuelles non-conformités."],
          ["Audit de surveillance", "En cours de cycle (généralement entre le 14e et le 22e mois), un audit vérifie que la démarche qualité est maintenue."],
          ["Audit de renouvellement", "Avant l'échéance des 3 ans, un nouvel audit permet de repartir sur un cycle complet."],
        ].map(([t, d], i) => (
          <li key={t} className="grid grid-cols-[36px_1fr] gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#3B6EF5] text-sm font-extrabold text-white">{i + 1}</span>
            <span><strong>{t}.</strong> {d}</span>
          </li>
        ))}
      </ol>

      <h2>Combien coûte Qualiopi et combien de temps prévoir ?</h2>
      <p>
        Il n&apos;existe <strong>pas de tarif officiel unique</strong> : le coût de Qualiopi correspond au prix des audits,
        fixé librement par chaque organisme certificateur, et varie selon la <strong>taille de votre structure</strong> et le
        nombre de catégories d&apos;actions auditées. Le vrai budget, souvent sous-estimé, est le <strong>temps de préparation
        des preuves</strong> — d&apos;autant plus lourd si vos documents sont éparpillés entre tableurs, e-mails et dossiers
        partagés.
      </p>

      <h2>Comment préparer son audit Qualiopi sereinement ?</h2>
      <AnswerBox>
        La clé n&apos;est pas de « préparer l&apos;audit » la veille, mais de <strong>constituer la preuve au fil de
        l&apos;eau</strong> : chaque convention, émargement, évaluation ou réclamation rattaché à son indicateur au moment où
        il est produit. Le jour de l&apos;audit, le dossier est déjà complet et classé.
      </AnswerBox>
      <p>
        Concrètement, trois réflexes font gagner un audit : tenir les <strong>registres</strong> (réclamations, veille,
        partenaires) en continu plutôt que de les reconstituer&nbsp;; tracer les sessions (émargements horodatés, signatures
        électroniques)&nbsp;; et pouvoir <strong>retrouver chaque preuve par indicateur</strong> sans fouiller.
      </p>
      <Callout>
        <strong>Avec un logiciel dédié comme OFManager</strong>, chaque preuve est rattachée à son indicateur dès qu&apos;elle
        est produite, les registres se tiennent au quotidien et le <strong>dossier d&apos;audit s&apos;exporte en 1 clic</strong>,
        classé par indicateur — avec un BPF pré-rempli à partir de vos données réelles. Voir la page{" "}
        <Link href="/solutions/qualiopi">logiciel Qualiopi</Link> ou l&apos;ensemble des{" "}
        <Link href="/fonctionnalites">fonctionnalités</Link>.
      </Callout>

      <h2>En résumé</h2>
      <p>
        Qualiopi est le passage obligé vers les financements publics et mutualisés de la formation. Elle repose sur 7 critères
        et 32 indicateurs, se prépare par la preuve, et se maintient sur un cycle de 3 ans. L&apos;organisme qui documente sa
        qualité en continu transforme l&apos;audit d&apos;une épreuve en simple formalité. Étape suivante logique si vous
        démarrez : <Link href={`${BLOG_BASE}/ouvrir-organisme-de-formation`}>ouvrir votre organisme de formation</Link>.
      </p>
    </BlogArticleShell>
  );
}
