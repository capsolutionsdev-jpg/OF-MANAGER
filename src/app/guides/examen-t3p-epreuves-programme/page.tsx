// src/app/guides/examen-t3p-epreuves-programme/page.tsx
// Pilier informationnel « Examen T3P ». Server Component. FAITS uniquement.
import type { Metadata } from "next";
import Link from "next/link";
import { getArticle, BLOG_BASE } from "@/lib/blog/registry";
import { BlogArticleShell, AnswerBox, FactBox, Callout, type Faq, type Source } from "@/components/blog/blog-shell";

const meta = getArticle("examen-t3p-epreuves-programme")!;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: `${BLOG_BASE}/${meta.slug}` },
  openGraph: { title: meta.title, description: meta.description, url: `${BLOG_BASE}/${meta.slug}`, type: "article" },
};

const MATIERES: [string, string][] = [
  ["Réglementation du T3P", "Le cadre du transport public particulier de personnes : statuts, obligations, contrôles."],
  ["Gestion", "Notions de gestion et de développement de l'activité (facturation, charges, relation client)."],
  ["Sécurité routière", "Règles de conduite, prévention des risques, comportement au volant."],
  ["Français", "Compréhension et expression écrite, indispensable à la relation client."],
  ["Anglais", "Niveau élémentaire (A2) : comprendre et répondre à un client anglophone."],
];

const faqs: Faq[] = [
  {
    q: "En quoi consiste l'examen T3P ?",
    a: "L'examen T3P (transport public particulier de personnes) comporte une partie d'admissibilité — un tronc commun écrit de cinq matières — puis une épreuve d'admission propre au métier visé (VTC ou taxi). Il faut réussir les deux parties pour obtenir sa carte professionnelle.",
  },
  {
    q: "Quelles sont les matières du tronc commun T3P ?",
    a: "Le tronc commun couvre cinq matières communes aux VTC et aux taxis : la réglementation du T3P, la gestion, la sécurité routière, le français et l'anglais (niveau élémentaire). C'est la partie d'admissibilité de l'examen.",
  },
  {
    q: "Quelle est la différence entre l'examen VTC et l'examen taxi ?",
    a: "Le tronc commun est identique. La différence est dans l'épreuve d'admission : le VTC passe une mise en situation de conduite et de relation client, tandis que le taxi ajoute une épreuve locale (réglementation et connaissance du territoire du département d'exercice).",
  },
  {
    q: "Qui organise l'examen T3P ?",
    a: "L'examen est organisé par les Chambres de Métiers et de l'Artisanat (CMA). Elles fixent le calendrier des sessions et gèrent les inscriptions. Après réussite, c'est la préfecture qui délivre la carte professionnelle.",
  },
  {
    q: "Peut-on financer la préparation à l'examen T3P avec le CPF ?",
    a: "Oui. Les préparations aux examens VTC et taxi sont des certifications enregistrées au Répertoire spécifique, éligibles au CPF lorsqu'elles sont dispensées par un organisme certifié Qualiopi.",
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
        L&apos;<strong>examen T3P</strong> (transport public particulier de personnes) ouvre l&apos;accès aux métiers de
        chauffeur <strong>VTC</strong> et de <strong>taxi</strong>. Il se compose d&apos;un <strong>tronc commun écrit</strong>
        {" "}(5 matières) et d&apos;une <strong>épreuve d&apos;admission</strong> propre au métier. Il est organisé par les
        <strong> Chambres de Métiers et de l&apos;Artisanat (CMA)</strong>.
      </AnswerBox>

      <p>
        Passer l&apos;examen T3P, c&apos;est l&apos;étape qui sépare le projet de la carte professionnelle. Que vous prépariez
        votre reconversion ou que vous vouliez <Link href={`${BLOG_BASE}/devenir-chauffeur-vtc-taxi`}>devenir chauffeur VTC ou
        taxi</Link>, voici précisément ce que couvre l&apos;examen et comment il est structuré.
      </p>

      <h2>Qu&apos;est-ce que l&apos;examen T3P ?</h2>
      <p>
        Depuis la réforme du T3P, VTC et taxis partagent un <strong>socle d&apos;examen commun</strong>, complété par une
        épreuve spécifique à chaque métier. L&apos;objectif : vérifier que le futur conducteur maîtrise la réglementation, la
        sécurité, la gestion de son activité et la relation client. L&apos;examen est <strong>national dans son tronc
        commun</strong> et organisé localement par les CMA.
      </p>

      <h2>Les épreuves : tronc commun puis admission</h2>
      <AnswerBox>
        L&apos;examen se déroule en deux temps : d&apos;abord l&apos;<strong>admissibilité</strong> (le tronc commun écrit,
        commun à tous), puis l&apos;<strong>admission</strong> (l&apos;épreuve pratique et spécifique au métier visé). Il faut
        valider les deux pour être reçu.
      </AnswerBox>

      <h2>Le tronc commun (VTC et taxi)</h2>
      <p>Cinq matières, identiques pour les deux métiers :</p>
      <div className="my-7 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 text-[#0D1B3E]">
              <th className="py-2 pr-4 font-bold" style={{ fontFamily: "var(--font-sora)" }}>Matière</th>
              <th className="py-2 font-bold" style={{ fontFamily: "var(--font-sora)" }}>Ce qu&apos;elle évalue</th>
            </tr>
          </thead>
          <tbody>
            {MATIERES.map(([m, d]) => (
              <tr key={m} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-4 font-semibold text-[#0D1B3E]">{m}</td>
                <td className="py-3 text-slate-600">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>L&apos;épreuve d&apos;admission (spécifique au métier)</h2>
      <p>
        C&apos;est là que VTC et taxi se distinguent. Le <strong>VTC</strong> passe une mise en situation de conduite et de
        relation client. Le <strong>taxi</strong> ajoute une <strong>épreuve d&apos;admission propre</strong>, avec une
        dimension locale : réglementation et connaissance du territoire du département où il exercera. Cette spécificité
        locale explique pourquoi l&apos;examen taxi se prépare toujours en lien avec le département visé.
      </p>

      <h2>Comment se préparer et financer l&apos;examen ?</h2>
      <FactBox
        title="Les bons réflexes"
        items={[
          "La préparation n'est pas obligatoire, mais fortement conseillée vu le taux d'échec",
          "Préparation éligible au CPF via un organisme certifié Qualiopi",
          "Des examens blancs pour s'entraîner dans les conditions réelles",
          "Pour le taxi : réviser la réglementation et la topographie du département visé",
        ]}
      />
      <Callout>
        Vous préparez des candidats au T3P ? <strong>OFManager</strong> gère le parcours de l&apos;inscription à l&apos;examen
        CMA, avec des <strong>examens blancs VTC &amp; taxi intégrés</strong> et le suivi de la formation continue obligatoire.
        Voir <Link href="/solutions/vtc-taxi">la solution VTC / Taxi</Link> ou les{" "}
        <Link href="/fonctionnalites">fonctionnalités</Link>.
      </Callout>

      <h2>En résumé</h2>
      <p>
        L&apos;examen T3P associe un tronc commun écrit (réglementation, gestion, sécurité routière, français, anglais) et une
        épreuve d&apos;admission propre au VTC ou au taxi — ce dernier avec sa part locale. Organisé par les CMA, il conditionne
        la carte professionnelle délivrée par la préfecture. Pour le parcours complet, voyez{" "}
        <Link href={`${BLOG_BASE}/devenir-chauffeur-vtc-taxi`}>devenir chauffeur VTC ou taxi</Link>.
      </p>
    </BlogArticleShell>
  );
}
