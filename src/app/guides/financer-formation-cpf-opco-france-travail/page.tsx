// src/app/guides/financer-formation-cpf-opco-france-travail/page.tsx
// Pilier informationnel « Financer une formation ». Server Component.
// FAITS uniquement — montants prudents, sources officielles en bas.
import type { Metadata } from "next";
import Link from "next/link";
import { getArticle, BLOG_BASE } from "@/lib/blog/registry";
import { BlogArticleShell, AnswerBox, FactBox, Callout, type Faq, type Source } from "@/components/blog/blog-shell";

const meta = getArticle("financer-formation-cpf-opco-france-travail")!;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: `${BLOG_BASE}/${meta.slug}` },
  openGraph: { title: meta.title, description: meta.description, url: `${BLOG_BASE}/${meta.slug}`, type: "article" },
};

const STATUTS: [string, string][] = [
  ["Salarié du privé", "CPF, plan de développement des compétences (via l'employeur et son OPCO), Projet de Transition Professionnelle (PTP)"],
  ["Demandeur d'emploi", "CPF, aides de France Travail (AIF, POEI, AFPR), programmes des régions"],
  ["Travailleur indépendant", "CPF, fonds d'assurance formation (FIF-PL, AGEFICE, FAFCEA… selon l'activité)"],
  ["Agent public", "CPF, plan de formation de l'employeur public"],
  ["Personne en situation de handicap", "Dispositifs ci-dessus + financements de l'Agefiph"],
];

const faqs: Faq[] = [
  {
    q: "Comment savoir quel financement est fait pour moi ?",
    a: "Cela dépend de votre statut. Un salarié mobilise son CPF ou passe par l'employeur (plan de développement des compétences, OPCO) ; un demandeur d'emploi s'adresse à France Travail ; un indépendant à son fonds d'assurance formation. Le CPF, lui, est accessible à presque tous les actifs. Dans tous les cas, l'organisme de formation doit être certifié Qualiopi.",
  },
  {
    q: "Le CPF est-il gratuit pour le stagiaire ?",
    a: "Le CPF finance la formation à hauteur des droits acquis, mais depuis 2024 une participation forfaitaire (de l'ordre de 100 €, revalorisée) reste à la charge du titulaire. En sont dispensés les demandeurs d'emploi et les personnes dont la formation est cofinancée par l'employeur ou un OPCO.",
  },
  {
    q: "Une formation doit-elle être éligible pour être financée ?",
    a: "Oui. Pour être financée par le CPF, la formation doit mener à une certification enregistrée au RNCP ou au Répertoire spécifique, et être dispensée par un organisme certifié Qualiopi. Les autres financeurs (OPCO, France Travail) appliquent aussi leurs propres conditions d'éligibilité.",
  },
  {
    q: "Qui finance la formation d'un salarié ?",
    a: "Un salarié peut financer sa formation par son CPF, ou via son employeur : le plan de développement des compétences, souvent cofinancé par l'OPCO de l'entreprise (surtout pour les TPE-PME). Pour une reconversion longue, le Projet de Transition Professionnelle (PTP), géré par les associations Transitions Pro, prend le relais.",
  },
  {
    q: "Faut-il être certifié Qualiopi pour que mes stagiaires soient financés ?",
    a: "Oui. Côté organisme de formation, la certification Qualiopi est la condition d'accès à l'ensemble des financements publics et mutualisés (CPF, OPCO, France Travail, régions…). Sans elle, vos clients ne peuvent pas mobiliser ces fonds.",
  },
];

const sources: Source[] = [
  { label: "Mon Compte Formation — le CPF (moncompteformation.gouv.fr)", href: "https://www.moncompteformation.gouv.fr/" },
  { label: "Ministère du Travail — Financer sa formation", href: "https://travail-emploi.gouv.fr/formation-professionnelle/formation-en-alternance-10751/article/financer-sa-formation" },
  { label: "France Travail — Se former", href: "https://www.francetravail.fr/candidat/en-formation-1/mes-aides-financieres.html" },
  { label: "Transitions Pro — Projet de Transition Professionnelle", href: "https://www.transitionspro.fr/" },
];

export default function Page() {
  return (
    <BlogArticleShell meta={meta} faqs={faqs} sources={sources}>
      <AnswerBox>
        <strong>Financer une formation dépend de votre statut.</strong> Un <strong>salarié</strong> mobilise son CPF ou passe
        par son employeur (plan de développement, OPCO) ; un <strong>demandeur d&apos;emploi</strong> s&apos;adresse à
        <strong> France Travail</strong> ; un <strong>indépendant</strong> à son fonds d&apos;assurance formation. Le
        <strong> CPF</strong> reste accessible à presque tous les actifs. Point commun : l&apos;organisme doit être
        <strong> certifié Qualiopi</strong>.
      </AnswerBox>

      <p>
        Le paysage du financement de la formation professionnelle est riche… et déroutant. La bonne nouvelle : à chaque
        situation correspond un dispositif. Ce guide fait le tri par statut, explique les principaux mécanismes, et rappelle
        la condition qui les relie tous — la <Link href={`${BLOG_BASE}/certification-qualiopi-guide`}>certification
        Qualiopi</Link> côté organisme.
      </p>

      <h2>Qui peut financer votre formation ? (selon votre statut)</h2>
      <AnswerBox>
        Il n&apos;existe pas un financement unique mais une <strong>combinaison de dispositifs</strong> selon que vous êtes
        salarié, demandeur d&apos;emploi, indépendant ou agent public. Le tableau ci-dessous donne, pour chaque statut, les
        principaux leviers mobilisables.
      </AnswerBox>
      <div className="my-7 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 text-[#0D1B3E]">
              <th className="py-2 pr-4 font-bold" style={{ fontFamily: "var(--font-sora)" }}>Votre statut</th>
              <th className="py-2 font-bold" style={{ fontFamily: "var(--font-sora)" }}>Dispositifs mobilisables</th>
            </tr>
          </thead>
          <tbody>
            {STATUTS.map(([s, d]) => (
              <tr key={s} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-4 font-semibold text-[#0D1B3E]">{s}</td>
                <td className="py-3 text-slate-600">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Le CPF (Compte Personnel de Formation)</h2>
      <AnswerBox>
        Le <strong>CPF</strong> est un compte, alimenté en euros, dont dispose presque tout actif. Il se mobilise en autonomie
        sur <strong>Mon Compte Formation</strong>, pour toute formation certifiante éligible dispensée par un organisme
        Qualiopi. Depuis 2024, une <strong>participation forfaitaire</strong> (de l&apos;ordre de 100 €) reste à la charge du
        titulaire, sauf exceptions.
      </AnswerBox>
      <p>
        Les droits se cumulent chaque année (généralement 500 € par an, davantage pour les salariés les moins qualifiés), dans
        la limite d&apos;un plafond. Le titulaire choisit et paie sa formation directement en ligne, sans intermédiaire. C&apos;est
        le dispositif le plus universel — et souvent le premier réflexe des stagiaires.
      </p>

      <h2>Les OPCO (pour les salariés, via l&apos;employeur)</h2>
      <AnswerBox>
        Les <strong>OPCO</strong> (opérateurs de compétences) financent le <strong>plan de développement des compétences</strong>
        des entreprises, en particulier des <strong>TPE-PME</strong>, ainsi que l&apos;alternance. C&apos;est la voie employeur :
        l&apos;entreprise sollicite l&apos;OPCO de sa branche pour faire prendre en charge la formation de ses salariés.
      </AnswerBox>
      <p>
        Il existe onze OPCO, chacun rattaché à des secteurs d&apos;activité. Pour un organisme de formation, savoir orienter un
        client entreprise vers son OPCO est un vrai service — et un accélérateur de vente.
      </p>

      <h2>France Travail (pour les demandeurs d&apos;emploi)</h2>
      <AnswerBox>
        <strong>France Travail</strong> (ex-Pôle emploi) finance la formation des <strong>demandeurs d&apos;emploi</strong> via
        plusieurs aides : l&apos;<strong>AIF</strong> (Aide Individuelle à la Formation), la <strong>POEI</strong> et l&apos;<strong>AFPR</strong>
        {" "}(préparations à un poste en lien avec une embauche), en complément éventuel du CPF.
      </AnswerBox>

      <h2>Les autres dispositifs à connaître</h2>
      <FactBox
        title="Selon la situation, d'autres leviers existent"
        items={[
          "PTP — Projet de Transition Professionnelle (reconversion des salariés), géré par Transitions Pro",
          "FAF — fonds d'assurance formation des indépendants (FIF-PL, AGEFICE, FAFCEA… selon l'activité)",
          "Agefiph — financements pour les personnes en situation de handicap",
          "Conseils régionaux — programmes de formation, souvent pour les demandeurs d'emploi",
          "FNE-Formation — dispositif mobilisable dans certaines situations d'entreprise",
        ]}
      />

      <h2>Le point commun de tous ces financements : Qualiopi</h2>
      <p>
        Quelle que soit la source — CPF, OPCO, France Travail, région — un principe ne change pas : les <strong>fonds publics et
        mutualisés ne financent que les organismes certifiés Qualiopi</strong>. C&apos;est la porte d&apos;entrée obligatoire.
        Si vous démarrez, lisez notre guide <Link href={`${BLOG_BASE}/certification-qualiopi-guide`}>certification
        Qualiopi</Link>.
      </p>

      <h2>Côté organisme : faciliter le financement de vos stagiaires</h2>
      <p>
        Un stagiaire qui ne sait pas comment financer sa formation est un stagiaire qui abandonne. Les organismes qui
        <strong> orientent chaque prospect vers le bon dispositif</strong> — et préparent le dossier avec lui — transforment
        beaucoup plus.
      </p>
      <Callout>
        <strong>OFManager</strong> intègre un <strong>simulateur de financement</strong> (CPF, OPCO, France Travail, PTP) qui
        oriente chaque candidat selon son profil, et centralise les pièces du dossier. Voir les{" "}
        <Link href="/fonctionnalites">fonctionnalités</Link> ou demandez une <Link href="/demo">démo</Link>.
      </Callout>

      <h2>En résumé</h2>
      <p>
        Il y a toujours un financement adapté : CPF pour l&apos;autonomie, OPCO pour la voie employeur, France Travail pour les
        demandeurs d&apos;emploi, et des dispositifs ciblés pour les indépendants ou les reconversions. La condition côté
        organisme est unique — être <Link href={`${BLOG_BASE}/certification-qualiopi-guide`}>certifié Qualiopi</Link>. Vous
        débutez ? Voyez comment <Link href={`${BLOG_BASE}/ouvrir-organisme-de-formation`}>ouvrir votre organisme de
        formation</Link>.
      </p>
    </BlogArticleShell>
  );
}
