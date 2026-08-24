import type { Metadata } from "next";
import Link from "next/link";
import { EDITEUR, MAJ_LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Conditions générales de vente — OFManager",
  description: "Conditions générales de vente et d'utilisation du logiciel OFManager (SaaS) édité par CAP SOLUTIONS.",
  alternates: { canonical: "/cgv" },
};

function Art({ n, titre, children }: { n: number; titre: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">Article {n} — {titre}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

export default function CgvPage() {
  const E = EDITEUR;
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-10 sm:py-14">
      <div className="mb-8">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">← Retour à l&apos;accueil</Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Conditions générales de vente et d&apos;utilisation</h1>
      <p className="mt-2 text-sm text-muted-foreground">{E.produit}, édité par {E.raisonSociale}. Dernière mise à jour : {MAJ_LEGAL}.</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
        <Art n={1} titre="Objet et champ d'application">
          <p>
            Les présentes conditions générales (les « CGV ») régissent la souscription et l&apos;utilisation du
            logiciel de gestion pour organismes de formation {E.produit} (le « Service »), fourni en mode SaaS par
            {" "}{E.raisonSociale} (l&apos;« Éditeur ») à tout professionnel (le « Client »). Toute souscription
            emporte acceptation sans réserve des présentes CGV.
          </p>
        </Art>

        <Art n={2} titre="Description du Service">
          <p>
            {E.produit} est un logiciel en ligne d&apos;aide à la gestion des organismes de formation : gestion des
            candidats, sessions, inscriptions, documents, signatures électroniques, conformité Qualiopi et BPF,
            financement et facturation. Le détail des fonctionnalités par formule figure sur la page{" "}
            <Link href="/tarifs" className="font-medium text-primary hover:underline">Tarifs</Link>. L&apos;Éditeur peut
            faire évoluer les fonctionnalités pour améliorer le Service.
          </p>
        </Art>

        <Art n={3} titre="Souscription et compte">
          <p>
            La souscription s&apos;effectue en ligne ou après devis. Le Client garantit l&apos;exactitude des
            informations fournies et est responsable de la confidentialité de ses identifiants et des actions
            réalisées via son compte.
          </p>
        </Art>

        <Art n={4} titre="Essai et démonstration">
          <p>
            Le Client peut bénéficier d&apos;un accès de démonstration ou d&apos;une période d&apos;essai, sans
            engagement et sans valeur contractuelle au-delà de sa durée. À l&apos;issue de cette période, l&apos;accès
            peut être suspendu à défaut de souscription.
          </p>
        </Art>

        <Art n={5} titre="Prix et modalités de paiement">
          <p>
            Les prix en vigueur sont indiqués sur la page Tarifs, en euros et hors taxes. L&apos;abonnement est
            payable d&apos;avance selon la périodicité choisie (mensuelle ou annuelle). Les paiements sont réalisés
            par carte bancaire ou prélèvement SEPA via un prestataire de paiement sécurisé. Tout retard de paiement
            peut entraîner la suspension du Service après mise en demeure restée sans effet, ainsi que les
            pénalités légales applicables entre professionnels.
          </p>
        </Art>

        <Art n={6} titre="Durée, renouvellement et résiliation">
          <p>
            L&apos;abonnement est souscrit pour la durée choisie et se renouvelle par tacite reconduction pour une
            durée équivalente, sauf résiliation par l&apos;une des parties avant l&apos;échéance, depuis l&apos;espace
            client ou par écrit. La résiliation prend effet au terme de la période en cours ; les sommes déjà
            réglées ne sont pas remboursées, sauf disposition légale impérative.
          </p>
        </Art>

        <Art n={7} titre="Obligations de l'Éditeur">
          <p>
            L&apos;Éditeur met en œuvre les moyens raisonnables pour assurer la disponibilité et la sécurité du
            Service, ainsi qu&apos;un support. Le Service est fourni selon une obligation de moyens. Des interruptions
            pour maintenance ou cas de force majeure peuvent survenir ; l&apos;Éditeur s&apos;efforce d&apos;en limiter
            l&apos;impact.
          </p>
        </Art>

        <Art n={8} titre="Obligations du Client">
          <p>
            Le Client s&apos;engage à utiliser le Service conformément à sa destination et à la réglementation
            applicable aux organismes de formation. Il est seul responsable des contenus et données qu&apos;il
            traite via le Service, de leur licéité et de l&apos;information de ses propres apprenants et clients.
          </p>
        </Art>

        <Art n={9} titre="Données personnelles">
          <p>
            Dans le cadre du Service, l&apos;Éditeur agit en qualité de sous-traitant du Client au sens du RGPD.
            Les conditions du traitement figurent dans la{" "}
            <Link href="/confidentialite" className="font-medium text-primary hover:underline">politique de confidentialité</Link>{" "}
            et, le cas échéant, dans un accord de sous-traitance (DPA) fourni au Client. Les données sont hébergées
            au sein de l&apos;Union européenne.
          </p>
        </Art>

        <Art n={10} titre="Propriété intellectuelle">
          <p>
            Le Service, ses composants et sa marque demeurent la propriété exclusive de l&apos;Éditeur. La
            souscription confère un droit d&apos;utilisation personnel, non exclusif et non cessible, pour la durée
            de l&apos;abonnement. Les données du Client lui restent acquises et lui sont restituables sur demande.
          </p>
        </Art>

        <Art n={11} titre="Responsabilité">
          <p>
            La responsabilité de l&apos;Éditeur ne saurait être engagée pour les dommages indirects. En tout état de
            cause, et dans la limite permise par la loi, la responsabilité de l&apos;Éditeur est plafonnée aux sommes
            versées par le Client au titre des douze (12) mois précédant le fait générateur. L&apos;Éditeur
            n&apos;est pas responsable de l&apos;usage fait du Service par le Client ni de la conformité de son
            activité.
          </p>
        </Art>

        <Art n={12} titre="Confidentialité">
          <p>Chaque partie s&apos;engage à préserver la confidentialité des informations non publiques échangées.</p>
        </Art>

        <Art n={13} titre="Modification des CGV">
          <p>
            L&apos;Éditeur peut modifier les présentes CGV. Les Clients sont informés des modifications
            substantielles ; leur poursuite d&apos;utilisation vaut acceptation de la version en vigueur.
          </p>
        </Art>

        <Art n={14} titre="Droit applicable et litiges">
          <p>
            Les présentes CGV sont soumises au droit français. À défaut de résolution amiable, tout litige relève
            de la compétence des tribunaux du ressort du siège de l&apos;Éditeur, sous réserve des règles impératives
            applicables.
          </p>
        </Art>
      </div>

      <p className="mt-10 text-xs text-muted-foreground">
        Modèle indicatif — à faire valider et adapter par un conseil juridique avant toute commercialisation.
      </p>
    </main>
  );
}
