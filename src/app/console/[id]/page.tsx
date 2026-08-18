import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditOrganismeForm } from "@/components/console/edit-organisme-form";
import { FormationsConfigForm } from "@/components/console/formations-config-form";
import { UsageCard } from "@/components/facturation/usage-card";
import { getResolvedPlans } from "@/lib/pricing";
import { PLAN_ORDER } from "@/lib/plans";
import { getOrgUsage } from "@/lib/usage";
import { ContratsPrestationCard, type ContratPrestationRow } from "@/components/console/contrats-prestation-card";
import { montantNet, ENGAGEMENT_LABELS, type EngagementType } from "@/lib/contrats/prestation";
import { FacturesEditeurCard, type FactureEditeurRow } from "@/components/console/factures-editeur-card";
import { AbonnementSepaCard } from "@/components/console/abonnement-sepa-card";
import { ImpersonateButton } from "@/components/console/impersonate-button";
import { sirenFromSiret, type FactureStatut } from "@/lib/factures/editeur";
import { isStripeConfigured } from "@/lib/stripe";
import { roleLabels } from "@/lib/navigation";
import { withDbRetry, safeRead } from "@/lib/db-retry";

export const dynamic = "force-dynamic";

export default async function ConsoleOrganismePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Lecture ESSENTIELLE : ré-essayée sur blip transitoire (sinon 500 de toute la page).
  const org = await withDbRetry(() =>
    prisma.organisme.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true, isActive: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
  );
  if (!org) notFound();

  const { plans } = await getResolvedPlans();
  const ordered = PLAN_ORDER.map((k) => plans[k]);
  // Cartes SECONDAIRES : dégradent proprement si la base blippe (jamais de 500 global).
  const usage = await safeRead(
    () => getOrgUsage(org.id, org.formule),
    {
      emails: { used: 0, limit: null, pct: 0, near: false, over: false },
      inscriptions: { used: 0, limit: null, pct: 0, near: false, over: false },
      moisLabel: "",
    },
    "usage",
  );

  // Contrats de prestation (abonnement) de ce client.
  const contratsRaw = await safeRead(
    () => prisma.contratPrestation.findMany({ where: { organismeId: id }, orderBy: { createdAt: "desc" } }),
    [],
    "contrats",
  );
  const contrats: ContratPrestationRow[] = contratsRaw.map((c) => ({
    id: c.id,
    reference: c.reference,
    formuleNom: plans[c.formule as keyof typeof plans]?.name ?? c.formule,
    montantNet: montantNet(Number(c.montantMensuel), c.remisePct),
    engagementLabel: ENGAGEMENT_LABELS[c.engagement as EngagementType],
    statut: c.statut as ContratPrestationRow["statut"],
    token: c.token,
    signataireNom: c.signataireNom,
    signedAt: c.signedAt ? c.signedAt.toISOString() : null,
  }));
  const formules = ordered.map((p) => ({ key: p.key, name: p.name, price: p.price }));

  // Factures éditeur (abonnement) de ce client.
  const facturesRaw = await safeRead(
    () => prisma.factureEditeur.findMany({ where: { organismeId: id }, orderBy: { createdAt: "desc" } }),
    [],
    "factures",
  );
  const factures: FactureEditeurRow[] = facturesRaw.map((f) => ({
    id: f.id,
    numero: f.numero,
    statut: f.statut as FactureStatut,
    periodeLabel: f.periodeDebut.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    montantTTC: Number(f.montantTTC),
  }));
  const sirenManquant = !sirenFromSiret(org.siret);
  const abonnementJusquau = org.abonnementJusquau ? org.abonnementJusquau.toLocaleDateString("fr-FR") : null;
  const stripeConfigured = isStripeConfigured();

  // Sécurité : on ne transmet JAMAIS les clés API au navigateur, seulement leur
  // état (définie ou non). cf. SecretField + updateOrganisme.
  const { brevoApiKey, anthropicApiKey, yousignApiKey, ...orgRest } = org;
  const formOrg = {
    ...orgRest,
    brevoApiKeySet: !!brevoApiKey,
    anthropicApiKeySet: !!anthropicApiKey,
    yousignApiKeySet: !!yousignApiKey,
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/console/organismes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux organismes
      </Link>
      <PageHeader title={org.nom} subtitle="Configuration de l'instance">
        {org.version && <Badge variant="secondary">{org.version}</Badge>}
        <Badge>{org.statut}</Badge>
        {org.appUrl && (
          <a
            href={org.appUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-primary hover:bg-muted"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Ouvrir l&apos;app
          </a>
        )}
        <ImpersonateButton organismeId={org.id} orgNom={org.nom} />
      </PageHeader>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm text-muted-foreground">
            Comptes ({org.users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {org.users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{u.name}</span>
              <span className="text-muted-foreground">{u.email}</span>
              <Badge variant="secondary">{roleLabels[u.role]}</Badge>
              {!u.isActive && <Badge className="bg-rose-500/10 text-rose-700">inactif</Badge>}
            </div>
          ))}
          {org.users.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun compte rattaché.</p>
          )}
        </CardContent>
      </Card>

      <UsageCard usage={usage} title="Consommation facturable" />

      <ContratsPrestationCard organismeId={org.id} contrats={contrats} formules={formules} />

      <AbonnementSepaCard
        organismeId={org.id}
        hasSubscription={!!org.stripeSubscriptionId}
        abonnementJusquau={abonnementJusquau}
        stripeConfigured={stripeConfigured}
      />

      <FacturesEditeurCard organismeId={org.id} factures={factures} sirenManquant={sirenManquant} />

      <FormationsConfigForm
        organismeId={org.id}
        initialSlugs={org.configurationsFormations}
      />

      <EditOrganismeForm org={formOrg} plans={ordered} />
    </div>
  );
}
