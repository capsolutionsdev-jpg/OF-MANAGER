import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Users, CreditCard, ReceiptText, Gauge, Settings2, History } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { HealthScoreCard } from "@/components/console/health-score-card";
import { clientHealthFrom } from "@/lib/console-health-score";
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

  // Signaux du SCORE DE SANTÉ / CHURN (lectures annexes tolérantes à la panne).
  const ticketsOuverts = await safeRead(
    () => prisma.supportTicket.count({ where: { organismeId: id, statut: "OUVERT" } }),
    0,
    "tickets",
  );
  const derniereInscription = await safeRead(
    () => prisma.inscription.findFirst({ where: { organismeId: id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    null,
    "derniere-activite",
  );
  const joursDepuisActivite = derniereInscription
    ? Math.floor((Date.now() - derniereInscription.createdAt.getTime()) / 86_400_000)
    : null;
  const facturesImpayees = facturesRaw.filter((f) => f.statut === "EMISE" || f.statut === "DEPOSEE").length;
  const health = clientHealthFrom({
    statut: org.statut,
    hasSubscription: !!org.stripeSubscriptionId,
    abonnementActif: !!org.abonnementJusquau && org.abonnementJusquau.getTime() > Date.now(),
    usageActifCeMois: usage.emails.used + usage.inscriptions.used > 0,
    joursDepuisActivite,
    ticketsOuverts,
    facturesImpayees,
  });

  // Activité récente (journal d'audit) — inclut la trace des « mode support ».
  const activite = await safeRead(
    () =>
      prisma.auditLog.findMany({
        where: { organismeId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          action: true,
          entityType: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
    [],
    "activite",
  );

  // Sécurité : on ne transmet JAMAIS les clés API au navigateur, seulement leur
  // état (définie ou non). cf. SecretField + updateOrganisme.
  const { brevoApiKey, anthropicApiKey, imageApiKey, yousignApiKey, ...orgRest } = org;
  const formOrg = {
    ...orgRest,
    brevoApiKeySet: !!brevoApiKey,
    anthropicApiKeySet: !!anthropicApiKey,
    imageApiKeySet: !!imageApiKey,
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
      <PageHeader title={org.nom} subtitle="Fiche client — pilotage 360°">
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

      {/* Santé du client : toujours visible, au-dessus des onglets. */}
      <HealthScoreCard health={health} />

      <Tabs defaultValue="apercu">
        <TabsList className="w-full">
          <TabsTrigger value="apercu">
            <Users className="h-4 w-4" /> Vue d&apos;ensemble
          </TabsTrigger>
          <TabsTrigger value="abonnement">
            <CreditCard className="h-4 w-4" /> Abonnement
          </TabsTrigger>
          <TabsTrigger value="facturation">
            <ReceiptText className="h-4 w-4" /> Facturation
          </TabsTrigger>
          <TabsTrigger value="usage">
            <Gauge className="h-4 w-4" /> Usage
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings2 className="h-4 w-4" /> Configuration
          </TabsTrigger>
          <TabsTrigger value="activite">
            <History className="h-4 w-4" /> Activité
          </TabsTrigger>
        </TabsList>

        {/* VUE D'ENSEMBLE — comptes rattachés */}
        <TabsContent value="apercu" className="space-y-6 pt-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm text-muted-foreground">Comptes ({org.users.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {org.users.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{u.name}</span>
                  <span className="text-muted-foreground">{u.email}</span>
                  <Badge variant="secondary">{roleLabels[u.role]}</Badge>
                  {!u.isActive && <Badge variant="destructive">inactif</Badge>}
                </div>
              ))}
              {org.users.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucun compte rattaché.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABONNEMENT — prélèvement SEPA + contrats de prestation */}
        <TabsContent value="abonnement" className="space-y-6 pt-4">
          <AbonnementSepaCard
            organismeId={org.id}
            hasSubscription={!!org.stripeSubscriptionId}
            abonnementJusquau={abonnementJusquau}
            stripeConfigured={stripeConfigured}
          />
          <ContratsPrestationCard organismeId={org.id} contrats={contrats} formules={formules} />
        </TabsContent>

        {/* FACTURATION — factures éditeur (Factur-X / conformité 2026) */}
        <TabsContent value="facturation" className="space-y-6 pt-4">
          <FacturesEditeurCard organismeId={org.id} factures={factures} sirenManquant={sirenManquant} />
        </TabsContent>

        {/* USAGE — consommation facturable du mois */}
        <TabsContent value="usage" className="space-y-6 pt-4">
          <UsageCard usage={usage} title="Consommation facturable" />
        </TabsContent>

        {/* CONFIGURATION — catalogue + paramètres de l'instance */}
        <TabsContent value="config" className="space-y-6 pt-4">
          <FormationsConfigForm organismeId={org.id} initialSlugs={org.configurationsFormations} />
          <EditOrganismeForm org={formOrg} plans={ordered} />
        </TabsContent>

        {/* ACTIVITÉ — journal d'audit récent (dont mode support) */}
        <TabsContent value="activite" className="space-y-6 pt-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm text-muted-foreground">Activité récente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activite.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune activité enregistrée.</p>
              )}
              {activite.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="tabular-nums text-muted-foreground">
                    {a.createdAt.toLocaleDateString("fr-FR")}
                  </span>
                  <Badge variant="secondary">{a.action}</Badge>
                  <span className="text-muted-foreground">{a.entityType}</span>
                  {a.user && (
                    <span className="ml-auto text-muted-foreground">{a.user.name ?? a.user.email}</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
