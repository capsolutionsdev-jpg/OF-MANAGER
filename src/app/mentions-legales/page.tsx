import type { Metadata } from "next";
import Link from "next/link";
import { EDITEUR, MAJ_LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Mentions légales — OFManager",
  description: "Mentions légales du site et du logiciel OFManager, édité par CAP SOLUTIONS.",
  alternates: { canonical: "/mentions-legales" },
};

function Ligne({ label, value }: { label: string; value: string }) {
  return (
    <p className="mt-1">
      <span className="text-muted-foreground">{label} :</span> <span className="font-medium">{value}</span>
    </p>
  );
}

export default function MentionsLegalesPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-10 sm:py-14">
      <div className="mb-8">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">← Retour à l&apos;accueil</Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mentions légales</h1>
      <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : {MAJ_LEGAL}.</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Éditeur du site</h2>
          <Ligne label="Raison sociale" value={EDITEUR.raisonSociale} />
          <Ligne label="Forme juridique" value={EDITEUR.forme} />
          <Ligne label="Capital social" value={EDITEUR.capital} />
          <Ligne label="SIRET" value={EDITEUR.siret} />
          <Ligne label="RCS" value={EDITEUR.rcs} />
          <Ligne label="N° TVA intracommunautaire" value={EDITEUR.tva} />
          <Ligne label="Siège social" value={EDITEUR.adresse} />
          <Ligne label="Contact" value={EDITEUR.email} />
          {EDITEUR.telephone && <Ligne label="Téléphone" value={EDITEUR.telephone} />}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Directeur de la publication</h2>
          <p className="mt-2">{EDITEUR.directeurPublication}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">3. Hébergement</h2>
          <p className="mt-2">Le site et l&apos;application {EDITEUR.produit} sont hébergés par : {EDITEUR.hebergeur}.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Propriété intellectuelle</h2>
          <p className="mt-2">
            L&apos;ensemble des contenus du site (marque {EDITEUR.produit}, logos, textes, interfaces, code,
            visuels) est la propriété de {EDITEUR.raisonSociale} ou de ses partenaires, et protégé par le droit
            de la propriété intellectuelle. Toute reproduction ou représentation, totale ou partielle, sans
            autorisation écrite préalable, est interdite.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Données personnelles</h2>
          <p className="mt-2">
            Le traitement des données personnelles est décrit dans notre{" "}
            <Link href="/confidentialite" className="font-medium text-primary hover:underline">politique de confidentialité</Link>.
            Conformément au RGPD, vous disposez de droits d&apos;accès, de rectification, d&apos;effacement,
            d&apos;opposition et de portabilité, exerçables à l&apos;adresse {EDITEUR.email}. Réclamation possible
            auprès de la CNIL (www.cnil.fr).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">6. Cookies</h2>
          <p className="mt-2">
            Le site utilise uniquement les cookies et traceurs strictement nécessaires à son fonctionnement.
            Toute mesure d&apos;audience éventuelle est réalisée de manière anonymisée ; le cas échéant, votre
            consentement vous est demandé conformément aux recommandations de la CNIL.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">7. Responsabilité</h2>
          <p className="mt-2">
            {EDITEUR.raisonSociale} s&apos;efforce d&apos;assurer l&apos;exactitude des informations diffusées sur
            le site, sans garantie d&apos;exhaustivité. Les conditions d&apos;utilisation du logiciel sont régies
            par les{" "}
            <Link href="/cgv" className="font-medium text-primary hover:underline">conditions générales de vente</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">8. Droit applicable</h2>
          <p className="mt-2">
            Le présent site est soumis au droit français. Tout litige relatif à son utilisation relève de la
            compétence des tribunaux français.
          </p>
        </section>
      </div>

      <p className="mt-10 text-xs text-muted-foreground">
        Document indicatif — à faire valider par un conseil juridique avant publication définitive.
      </p>
    </main>
  );
}
