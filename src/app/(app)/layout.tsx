import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, AlertTriangle, FlaskConical } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { MobileTabBar } from "@/components/mobile-tabbar";
import { buildNav } from "@/lib/navigation";
import { getBranding, getCurrentOrganisme } from "@/lib/org";
import { designVars, getDesign } from "@/lib/themes";
import { hasFeature } from "@/lib/features";
import { requires2faEnrollment, ADMIN_2FA_ENFORCED } from "@/lib/security/mandatory-2fa";
import { getNotifications } from "@/lib/notifications";
import { trialStatus } from "@/lib/trial";
import {
  computeDemoState,
  startDemoIfNeeded,
  formatDemoLeft,
  type DemoOrgFields,
} from "@/lib/demo/lifecycle";
import { extendDemoAction } from "@/lib/actions/demo-lifecycle-actions";
import { getResolvedPlans } from "@/lib/pricing";
import { PLAN_ORDER } from "@/lib/plans";
import { isStripeConfigured } from "@/lib/stripe";
import { SubscribePanel } from "@/components/billing/subscribe-panel";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { RailProvider } from "@/components/rail-context";
import { isNativeApp } from "@/lib/native-app";
import { PushRegistrar } from "@/components/push/push-registrar";
import { NativeLinkHandler } from "@/components/native/native-link-handler";
import { PdfViewerModal } from "@/components/native/pdf-viewer-modal";
import { CommandPalette } from "@/components/command-palette";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MobileSpacer } from "@/components/mobile-spacer";
import { InstallPrompt } from "@/components/install-prompt";
import { ImpersonationBanner } from "@/components/impersonation-banner";

// Rendu dynamique : ces pages lisent la base de données et la session,
// elles ne doivent pas être pré-générées au build.
export const dynamic = "force-dynamic";

// Favicon dynamique : icône propre à l'organisme (onglet du navigateur).
export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return branding.faviconUrl ? { icons: { icon: branding.faviconUrl } } : {};
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Session unique : ce compte n'est utilisable que sur un seul appareil à la
  // fois. Si une connexion plus récente existe ailleurs (activeSessionId différent),
  // on déconnecte cet appareil. Idem si le compte a été désactivé entre-temps.
  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { activeSessionId: true, isActive: true, mustChangePassword: true, totpEnabled: true },
  });
  if (!account?.isActive) redirect("/deconnexion");
  if (account.activeSessionId && account.activeSessionId !== session.user.sid) {
    redirect("/deconnexion?reason=autre-appareil");
  }
  // Première connexion (mot de passe provisoire) → changement obligatoire.
  if (account.mustChangePassword) redirect("/bienvenue");
  // 2FA OBLIGATOIRE pour les rôles à hauts privilèges (§11) : tant qu'elle n'est
  // pas activée, on force l'enrôlement avant tout accès (ADMIN ici ; le
  // SUPERADMIN est couvert par le layout /console).
  if (ADMIN_2FA_ENFORCED && requires2faEnrollment(session.user.role, account.totpEnabled))
    redirect("/securite-2fa");

  // Marque du tenant : couleur principale injectée comme variable CSS
  // (les composants `bg-primary` / `text-primary` la reprennent), nom + logo
  // transmis à la barre de navigation. La couleur secondaire alimente `--brand-2`
  // (accent dégradé en haut de l'en-tête).
  const branding = await getBranding();
  const org = await getCurrentOrganisme(); // mis en cache (même requête)
  const design = getDesign(branding.design);
  const isDark = design?.mode === "dark";
  const dataDesign = design && design.key !== "defaut" ? design.key : undefined;
  const brandStyle = {
    ...designVars(branding.design, branding.couleurPrimaire),
    "--brand-2": branding.couleurSecondaire || branding.couleurPrimaire,
    ...(dataDesign ? { fontFamily: design!.fontSans } : {}),
  } as CSSProperties;

  // Cycle de vie de l'essai gratuit.
  const trial = trialStatus(org?.statut, org?.createdAt);

  // Cycle de vie de la DÉMO : on démarre le compteur 48 h à la 1re connexion,
  // puis on évalue l'état (bandeau ou écran d'expiration selon le temps restant).
  let demoFields: DemoOrgFields | null = org
    ? {
        isDemo: org.isDemo,
        demoFirstLoginAt: org.demoFirstLoginAt,
        demoExpiresAt: org.demoExpiresAt,
        demoHardExpiresAt: org.demoHardExpiresAt,
      }
    : null;
  if (org && demoFields?.isDemo && !demoFields.demoFirstLoginAt) {
    demoFields = await startDemoIfNeeded(org.id, demoFields);
  }
  const demo = computeDemoState(demoFields);

  // Essai expiré OU organisme suspendu (essai échu basculé SUSPENDU par le cron,
  // suspension manuelle…) → on bloque l'accès (le gérant doit souscrire).
  // NB : la connexion d'un tenant SUSPENDU est déjà refusée (auth) ; ce garde
  // couvre les sessions déjà ouvertes au moment de la suspension.
  const suspended = org?.statut === "SUSPENDU";
  // Un client ENTREPRISE (B2B) est un tiers de l'OF, pas un abonné de la
  // plateforme : il ne doit jamais voir l'état d'abonnement de son fournisseur
  // ni être bloqué par son essai/sa suspension.
  if ((trial.expired || suspended) && session.user.role !== "ENTREPRISE") {
    const isAdmin = session.user.role === "ADMIN";
    const { plans, popular } = await getResolvedPlans();
    const ordered = PLAN_ORDER.map((k) => plans[k]);
    return (
      <div className="grid min-h-screen place-items-center bg-muted/40 p-6" style={brandStyle}>
        <div data-slot="card" className="w-full max-w-2xl rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-warning/10 text-warning">
            <Clock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">
            {suspended ? "Compte suspendu" : "Période d'essai terminée"}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {suspended
              ? `L'accès à ${branding.nom} est suspendu. Choisissez une formule pour réactiver votre espace, ou contactez le support.`
              : `Votre essai gratuit de ${branding.nom} est arrivé à échéance. Choisissez une formule pour réactiver votre espace — le support est inclus partout.`}
          </p>

          {isAdmin ? (
            <div className="mt-6">
              <SubscribePanel plans={ordered} popular={popular} configured={isStripeConfigured()} />
            </div>
          ) : (
            <p className="mt-6 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
              Contactez le gérant de votre organisme pour réactiver l&apos;accès.
            </p>
          )}

          <div className="mt-6">
            <Link href="/deconnexion" prefetch={false} className="text-xs text-muted-foreground hover:text-foreground">
              Se déconnecter
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Démo expirée → écran de fin de démonstration (prolongation ou prise de contact).
  if (demo.expired) {
    const demoContact = process.env.DEMO_CONTACT_EMAIL || process.env.LEAD_NOTIF_EMAIL || null;
    return (
      <div className="grid min-h-screen place-items-center bg-muted/40 p-6" style={brandStyle}>
        <div data-slot="card" className="w-full max-w-lg rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-violet-500/10 text-violet-600">
            <FlaskConical className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">Votre démonstration est terminée</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Merci d&apos;avoir testé {branding.nom} ! Votre environnement de démonstration a
            expiré. Prolongez-le de 48 h pour continuer votre exploration, ou parlons de la mise
            en place de votre compte définitif.
          </p>

          <div className="mt-6 flex flex-col items-center gap-3">
            <form action={extendDemoAction}>
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
              >
                Prolonger la démo (48 h)
              </button>
            </form>
            {demoContact && (
              <a href={`mailto:${demoContact}`} className="text-sm font-medium text-primary hover:underline">
                Parler à un conseiller
              </a>
            )}
            <Link href="/deconnexion" prefetch={false} className="text-xs text-muted-foreground hover:text-foreground">
              Se déconnecter
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fonctionnalités FRAÎCHES (BD) pour le menu → reflète immédiatement la console.
  const navUser = { ...session.user, fonctionnalites: org?.fonctionnalites ?? session.user.fonctionnalites };

  // Les notifications sont des données ADMIN à l'échelle de l'organisme (leads,
  // relances, impayés, signatures dues…) → RÉSERVÉES AU STAFF. Un FORMATEUR ou un
  // APPRENANT ne doit jamais voir la cloche admin (fuite d'informations).
  const isStaff = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"].includes(session.user.role);
  const notifications =
    isStaff && hasFeature(navUser.fonctionnalites, "notifications")
      ? await getNotifications()
      : undefined;

  // Pied de page : liens « légaux » sortis de la barre (RGPD, Support) + mentions.
  const footerItems = buildNav(navUser.role, navUser.permissions ?? [], navUser.fonctionnalites ?? []).footer;
  const legalLine = [org?.raisonSociale || branding.nom, org?.siret ? `SIRET ${org.siret}` : null, org?.nda ? `NDA ${org.nda}` : null]
    .filter(Boolean)
    .join(" · ");

  // Mode APPLICATION native (Capacitor) : on masque l'habillage « site vitrine »
  // (pied de page marketing) pour un ressenti application. Web = inchangé.
  const native = await isNativeApp();

  return (
    <div
      className={cn("min-h-screen bg-background", isDark && "dark")}
      data-design={dataDesign}
      data-native={native ? "" : undefined}
      style={brandStyle}
    >
      {/* Enregistrement push — actif seulement dans l'app native. */}
      <PushRegistrar />
      {/* Documents/PDF ouverts dans l'afficheur intégré (app native). */}
      <NativeLinkHandler />
      <PdfViewerModal />
      {/* Anti-flash : applique l'état replié du rail avant le rendu (localStorage). */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{if(localStorage.getItem('ofm.rail.collapsed')==='1')document.documentElement.setAttribute('data-rail-collapsed','')}catch(e){}",
        }}
      />
      <RailProvider>
      <div className="flex min-h-screen">
        {/* Rail de navigation vertical (desktop ≥ lg) */}
        <AppSidebar
          user={navUser}
          brand={{ nom: branding.nom, logoUrl: branding.logoUrl }}
        />

        {/* Colonne de contenu */}
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar
            user={navUser}
            brand={{ nom: branding.nom, logoUrl: branding.logoUrl }}
            notifications={notifications}
          />
          {session.user.imp && <ImpersonationBanner orgNom={session.user.imp.orgNom} />}
          {trial.isTrial && session.user.role !== "ENTREPRISE" && (
            <div className="flex items-center justify-center gap-2 bg-warning/10 px-4 py-2 text-center text-xs font-medium text-warning">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Essai gratuit — il vous reste{" "}
              <span className="font-bold">{Math.max(0, trial.daysLeft)} jour{trial.daysLeft > 1 ? "s" : ""}</span>.
              <Link href="/tarifs" className="ml-1 underline hover:no-underline">Choisir une formule</Link>
            </div>
          )}
          {demo.isDemo && !demo.expired && (
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-violet-500/10 px-4 py-2 text-center text-xs font-medium text-violet-700 dark:text-violet-300">
              <FlaskConical className="h-3.5 w-3.5 shrink-0" />
              Environnement de démonstration — expire dans{" "}
              <span className="font-bold">{formatDemoLeft(demo.msLeft)}</span>.
              <form action={extendDemoAction} className="contents">
                <button type="submit" className="underline hover:no-underline">Prolonger 48 h</button>
              </form>
            </div>
          )}
          <CommandPalette />
          <main id="main-content" data-app-main className="mx-auto w-full max-w-[1400px] flex-1 p-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6">
            <Breadcrumbs />
            <ConfirmProvider>{children}</ConfirmProvider>
            <MobileSpacer />
          </main>

          {/* Pied de page « site » masqué dans l'app native (ressenti application). */}
          {!native && (
          <footer className="mt-8 border-t bg-card/40 pb-20 md:pb-0">
            <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-2 px-4 py-5 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
              <p>{legalLine || branding.nom}</p>
              <nav aria-label="Liens légaux" className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <Link href="/mentions-legales" className="hover:text-foreground hover:underline">
                  Mentions légales
                </Link>
                {footerItems.map((it) => (
                  <Link key={it.href} href={it.href} className="hover:text-foreground hover:underline">
                    {it.label}
                  </Link>
                ))}
              </nav>
            </div>
          </footer>
          )}
        </div>
      </div>
      </RailProvider>
      {/* Barre du bas mobile — une seule : métiers (ADMIN/RF) ou espace perso (formateur/apprenant). */}
      {navUser.role === "ADMIN" || navUser.role === "RESPONSABLE_FORMATION" ? (
        <MobileBottomNav
          role={navUser.role}
          permissions={navUser.permissions ?? []}
          fonctionnalites={navUser.fonctionnalites ?? []}
        />
      ) : (
        <MobileTabBar
          role={navUser.role}
          permissions={navUser.permissions ?? []}
          fonctionnalites={navUser.fonctionnalites ?? []}
        />
      )}
      <InstallPrompt />
    </div>
  );
}
