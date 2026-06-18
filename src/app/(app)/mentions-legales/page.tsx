import Link from "next/link";
import { Scale, ShieldCheck } from "lucide-react";
import { getCurrentOrganisme } from "@/lib/org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value && value !== "" ? value : "—"}</dd>
    </div>
  );
}

export default async function MentionsLegalesPage() {
  const org = await getCurrentOrganisme();
  const adresse = [org?.adresse, [org?.codePostal, org?.ville].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const representant = [org?.representant, org?.representantQualite].filter(Boolean).join(" — ");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Scale className="h-6 w-6" /> Mentions légales
        </h1>
        <p className="text-sm text-muted-foreground">
          Informations légales de l&apos;organisme de formation.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Identité de l&apos;organisme</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Dénomination" value={org?.raisonSociale || org?.nom} />
            <Field label="Représentant légal" value={representant || null} />
            <Field label="SIRET" value={org?.siret} />
            <Field label="N° de déclaration d'activité (NDA)" value={org?.nda} />
            <Field label="N° TVA intracommunautaire" value={org?.numeroTva} />
            <Field label="Certificateur" value={org?.certificateur} />
            <Field label="N° Qualiopi / certification" value={org?.qualiopiNumero} />
            <Field label="Adresse" value={adresse || null} />
            <Field label="Téléphone" value={org?.telephone} />
            <Field label="E-mail" value={org?.email} />
            <Field label="Site web" value={org?.siteWeb} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" /> Données personnelles (RGPD)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Les données collectées dans cet espace sont traitées dans le cadre de la gestion des
            formations (inscription, suivi pédagogique, obligations qualité et légales). Elles sont
            conservées pour la durée requise par la réglementation applicable aux organismes de formation.
          </p>
          <p>
            Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification et
            d&apos;effacement de vos données. Les modalités détaillées sont disponibles sur la page{" "}
            <Link href="/rgpd" className="font-medium text-primary hover:underline">RGPD</Link>.
          </p>
          {org?.nda && (
            <p className="text-xs">
              Déclaration d&apos;activité enregistrée sous le numéro {org.nda}. Cet enregistrement ne vaut
              pas agrément de l&apos;État.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
