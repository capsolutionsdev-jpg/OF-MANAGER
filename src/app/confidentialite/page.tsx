import type { Metadata } from "next";
import Link from "next/link";
import { getPublicBranding } from "@/lib/tenant-host";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité et protection des données personnelles de l'application OFManager.",
};

// Page PUBLIQUE (accessible sans connexion) — requise par Google Play (Data Safety)
// et Apple (App Store Review 5.1.1) comme URL de politique de confidentialité de l'app.
// ⚠️ Brouillon à faire valider par le responsable / le DPO de l'organisme avant publication.

const UPDATED = "12 août 2026";

export default async function ConfidentialitePage() {
  const brand = await getPublicBranding();
  const nom = brand.nom || "OFManager";

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-10 sm:py-14">
      <div className="mb-8">
        <Link href="/login" className="text-sm text-muted-foreground hover:underline">
          ← Retour
        </Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Politique de confidentialité
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Application mobile et service en ligne {nom}. Dernière mise à jour : {UPDATED}.
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Responsable du traitement</h2>
          {/* TODO CAP SOLUTIONS: revoir mentions légales avec le Kbis */}
          <p className="mt-2">
            {nom} est un logiciel de gestion destiné aux organismes de formation, édité par
            CAP SOLUTIONS. Chaque organisme de formation utilisant {nom} est responsable des
            données de ses propres candidats, apprenants et clients ; l&apos;éditeur agit en tant
            que sous-traitant au sens du RGPD, dans le cadre d&apos;un contrat de sous-traitance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Données que nous traitons</h2>
          <p className="mt-2">Selon votre usage, l&apos;application peut traiter :</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Identité et coordonnées</strong> : nom, prénom, date de naissance, adresse, e-mail, téléphone.</li>
            <li><strong>Documents et pièces</strong> : pièces d&apos;identité, justificatifs, attestations, contrats, conventions — y compris les documents numérisés via l&apos;appareil photo.</li>
            <li><strong>Données de formation</strong> : inscriptions, sessions, émargements, résultats, signatures électroniques.</li>
            <li><strong>Données de compte</strong> : identifiants de connexion, rôle, journaux d&apos;activité.</li>
            <li><strong>Données techniques</strong> : type d&apos;appareil, données de session strictement nécessaires au fonctionnement.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">3. Finalités et bases légales</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Gestion des inscriptions, sessions et dossiers de formation (exécution du contrat).</li>
            <li>Émargement et signature électronique des documents (obligation légale, conformité Qualiopi).</li>
            <li>Édition des documents (convocations, attestations, contrats) et suivi administratif.</li>
            <li>Sécurité, authentification et prévention des accès non autorisés (intérêt légitime).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Appareil photo</h2>
          <p className="mt-2">
            L&apos;accès à l&apos;appareil photo, lorsqu&apos;il est utilisé, sert uniquement à
            numériser des pièces du dossier administratif. Les images sont transmises de façon
            sécurisée et rattachées au dossier concerné ; elles ne sont ni utilisées à d&apos;autres
            fins, ni partagées avec des tiers non autorisés.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Destinataires, hébergement et transferts</h2>
          <p className="mt-2">
            Les données sont accessibles au personnel habilité de votre organisme de formation.
            L&apos;application et la base de données sont hébergées dans l&apos;Union européenne.
            Des sous-traitants techniques interviennent pour des services spécifiques : envoi
            d&apos;e-mails, signature électronique, stockage de fichiers, paiement, supervision
            technique et, le cas échéant, assistance par intelligence artificielle.
          </p>
          <p className="mt-2">
            Certains de ces prestataires (notamment l&apos;envoi d&apos;e-mails et l&apos;assistance
            par intelligence artificielle) peuvent être situés en dehors de l&apos;Union européenne.
            Dans ce cas, le transfert est encadré par des garanties appropriées au sens du RGPD
            (clauses contractuelles types ou cadre de protection des données UE–États-Unis). La liste
            des sous-traitants et de leur localisation est tenue à jour et peut vous être communiquée
            sur demande.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">6. Durée de conservation</h2>
          <p className="mt-2">
            Les données sont conservées pour la durée nécessaire aux finalités ci-dessus et aux
            obligations légales applicables aux organismes de formation (notamment les durées de
            conservation Qualiopi et comptables), puis supprimées ou archivées.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">7. Vos droits</h2>
          <p className="mt-2">
            Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification,
            d&apos;effacement, de limitation, d&apos;opposition et de portabilité. Pour exercer ces
            droits, contactez l&apos;organisme de formation responsable de vos données, ou
            l&apos;éditeur à l&apos;adresse indiquée ci-dessous. Vous pouvez également introduire une
            réclamation auprès de la CNIL (www.cnil.fr).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">8. Contact</h2>
          <p className="mt-2">
            Pour toute question relative à la protection de vos données :{" "}
            <a href="mailto:contact@ofmanager.info" className="font-medium text-primary hover:underline">contact@ofmanager.info</a>.
          </p>
        </section>
      </div>

      <p className="mt-10 text-xs text-muted-foreground">
        © {UPDATED.slice(-4)} {nom}. Ce document peut être mis à jour ; la date en tête de page
        indique la dernière version.
      </p>
    </main>
  );
}
