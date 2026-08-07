import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, UserPlus, Users, Building2, UserCog, GraduationCap, ChevronRight, CreditCard, Download } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { orgConfigFor } from "@/lib/org-identity";
import { roleLabels } from "@/lib/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChangePasswordForm } from "@/app/(app)/mon-compte/change-password-form";
import { getResolvedPlans } from "@/lib/pricing";
import { PLAN_ORDER, planKeyForOrg, euros } from "@/lib/plans";
import { isStripeConfigured } from "@/lib/stripe";
import { SubscribePanel } from "@/components/billing/subscribe-panel";
import { ManageSubscriptionButton } from "@/components/billing/manage-subscription-button";

export const dynamic = "force-dynamic";

const STATUT_BADGE: Record<string, { label: string; cls: string }> = {
  ACTIF: { label: "Abonnement actif", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  ESSAI: { label: "Période d'essai", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  SUSPENDU: { label: "Suspendu", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
};

const COMPTES = [
  { href: "/administration/comptes/collaborateur", icon: Users, title: "Collaborateur", desc: "Responsable formation, assistant — avec accès par section." },
  { href: "/administration/comptes/client-pro", icon: Building2, title: "Client pro", desc: "Entreprise cliente (B2B) + son espace / portail." },
  { href: "/administration/comptes/formateur", icon: UserCog, title: "Formateur", desc: "Formateur + accès à son espace (sessions, contrats, factures)." },
  { href: "/administration/comptes/candidat", icon: GraduationCap, title: "Candidat", desc: "Candidat + accès apprenant (cours, documents, émargements)." },
];

export default async function AdministrationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const me = session.user;
  const org = await orgConfigFor(me.organismeId ?? null);

  // Abonnement (facturation Stripe)
  const orgRow = me.organismeId
    ? await prisma.organisme.findUnique({
        where: { id: me.organismeId },
        select: { statut: true, formule: true, fonctionnalites: true, abonnementJusquau: true, stripeCustomerId: true },
      })
    : null;
  const { plans, popular } = await getResolvedPlans();
  const ordered = PLAN_ORDER.map((k) => plans[k]);
  const currentPlan = orgRow ? plans[planKeyForOrg(orgRow.formule, orgRow.fonctionnalites)] : null;
  const statutInfo = STATUT_BADGE[orgRow?.statut ?? "ESSAI"] ?? STATUT_BADGE.ESSAI;
  const isActif = orgRow?.statut === "ACTIF";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ShieldCheck className="h-6 w-6 text-primary" /> Administration
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Votre profil, votre mot de passe, et la création des comptes.
          </p>
        </div>
        <a
          href="/administration/export"
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
          title="Exporter toutes les données de votre organisme (réversibilité, format JSON ouvert)"
        >
          <Download className="h-4 w-4" /> Exporter mes données
        </a>
      </div>

      {/* Créer un compte — chaque type sur sa page */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-primary" /> Créer un compte
          </CardTitle>
          <CardDescription>Choisissez le type de compte à créer.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {COMPTES.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="group flex items-start gap-3 rounded-lg border p-4 transition hover:border-primary hover:bg-muted/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <c.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 font-medium">
                    {c.title}
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
                  </span>
                  <span className="block text-xs text-muted-foreground">{c.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Abonnement & facturation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-primary" /> Abonnement
          </CardTitle>
          <CardDescription>Votre formule, votre facturation et le paiement en ligne.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge className={statutInfo.cls}>{statutInfo.label}</Badge>
            {currentPlan && (
              <span className="font-medium">
                Formule {currentPlan.name} · {euros(currentPlan.price)}/mois
              </span>
            )}
            {orgRow?.abonnementJusquau && (
              <span className="text-muted-foreground">
                Prochaine échéance : {orgRow.abonnementJusquau.toLocaleDateString("fr-FR")}
              </span>
            )}
          </div>

          {isActif && orgRow?.stripeCustomerId ? (
            <ManageSubscriptionButton />
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {isActif
                  ? "Votre compte est actif."
                  : "Choisissez une formule pour activer (ou réactiver) votre espace :"}
              </p>
              {!isActif && (
                <SubscribePanel plans={ordered} popular={popular} configured={isStripeConfigured()} />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profil du gérant */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mon profil</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <div className="text-muted-foreground">Nom</div>
            <div className="font-medium">{me.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">E-mail</div>
            <div className="font-medium">{me.email}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Rôle</div>
            <div className="font-medium">{roleLabels[me.role]}</div>
          </div>
          <div className="sm:col-span-3 text-xs text-muted-foreground">
            Organisme : {org.name} — {org.email}
          </div>
        </CardContent>
      </Card>

      {/* Changer mon mot de passe */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Changer mon mot de passe</CardTitle>
          <CardDescription>8 caractères minimum, avec lettres et chiffres.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      {/* Réversibilité — export complet des données de l'organisme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4 text-primary" /> Export de mes données
          </CardTitle>
          <CardDescription>
            Réversibilité : téléchargez l&apos;intégralité des données de votre
            organisme (candidats, sessions, inscriptions, facturation…) au format
            ouvert JSON. Vos données vous appartiennent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="/administration/export"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-4 w-4" /> Exporter toutes mes données (JSON)
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
