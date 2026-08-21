import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireEntreprise } from "@/lib/entreprise-portal";
import { getBranding } from "@/lib/org";
import { designVars, getDesign } from "@/lib/themes";
import { ThemeToggle } from "@/components/theme-toggle";
import { EntrepriseNav } from "@/components/entreprise/entreprise-nav";
import { cn } from "@/lib/utils";

// Rendu dynamique : lit la session + la base (entreprise du client connecté).
export const dynamic = "force-dynamic";

/**
 * Habillage DÉDIÉ du portail client B2B (rôle ENTREPRISE) — volontairement hors
 * du groupe (app) pour ne pas hériter du chrome staff (rail, recherche candidat,
 * bandeaux d'abonnement…). Un client voit la marque de SON organisme de
 * formation + une navigation simple entre ses 5 rubriques.
 */
export default async function PortailEntrepriseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Défense en profondeur (parité avec le layout (app)) : compte encore actif +
  // session unique (déconnecte si le compte a été désactivé ou repris ailleurs).
  const session = await auth();
  if (!session?.user) redirect("/login");
  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isActive: true, activeSessionId: true },
  });
  if (!account?.isActive) redirect("/deconnexion");
  if (account.activeSessionId && account.activeSessionId !== session.user.sid) {
    redirect("/deconnexion?reason=autre-appareil");
  }

  const entreprise = await requireEntreprise();
  const branding = await getBranding();
  const design = getDesign(branding.design);
  const isDark = design?.mode === "dark";
  const brandStyle = {
    ...designVars(branding.design, branding.couleurPrimaire),
    "--brand-2": branding.couleurSecondaire || branding.couleurPrimaire,
  } as CSSProperties;

  return (
    <div className={cn("min-h-screen bg-background text-foreground", isDark && "dark")} style={brandStyle}>
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt={branding.nom} className="h-7 w-7 rounded object-contain" />
            ) : (
              <div className="grid h-7 w-7 place-items-center rounded bg-primary text-xs font-bold text-primary-foreground">
                {branding.nom.slice(0, 1)}
              </div>
            )}
            <span className="truncate text-sm font-semibold">{branding.nom}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/deconnexion"
              prefetch={false}
              title="Se déconnecter"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4">
        <div className="pt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Espace client</p>
          <h1 className="text-2xl font-bold tracking-tight">{entreprise.raisonSociale}</h1>
        </div>
        <div className="mt-4 border-b">
          <EntrepriseNav />
        </div>
        <main id="main-content" className="py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
