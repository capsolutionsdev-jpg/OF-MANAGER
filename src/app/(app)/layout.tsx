import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppTopNav } from "@/components/app-topnav";
import { getBranding, getCurrentOrganisme } from "@/lib/org";
import { designVars, getDesign } from "@/lib/themes";
import { hasFeature } from "@/lib/features";
import { getNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";

// Rendu dynamique : ces pages lisent la base de données et la session,
// elles ne doivent pas être pré-générées au build.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Marque du tenant : couleur principale injectée comme variable CSS
  // (les composants `bg-primary` / `text-primary` la reprennent), nom + logo
  // transmis à la barre de navigation.
  const branding = await getBranding();
  const org = await getCurrentOrganisme(); // mis en cache (même requête)
  // Habillage du tenant : design (mode + surfaces + police + arrondi) ou, à
  // défaut, palette de couleur seule (compat). designVars retombe sur le legacy.
  const design = getDesign(branding.design);
  const isDark = design?.mode === "dark";
  const dataDesign = design && design.key !== "defaut" ? design.key : undefined;
  const brandStyle = {
    ...designVars(branding.design, branding.couleurPrimaire),
    ...(dataDesign ? { fontFamily: design!.fontSans } : {}),
  } as CSSProperties;

  // Fonctionnalités FRAÎCHES (BD) pour le menu → reflète immédiatement la console
  // (le blocage d'URL au middleware s'appuie sur le JWT, rafraîchi à la reconnexion).
  const navUser = { ...session.user, fonctionnalites: org?.fonctionnalites ?? session.user.fonctionnalites };

  // Centre de notifications (module avancé) : alertes dérivées des données.
  const notifications = hasFeature(navUser.fonctionnalites, "notifications")
    ? await getNotifications()
    : undefined;

  return (
    <div
      className={cn("min-h-screen bg-muted/40", isDark && "dark")}
      data-design={dataDesign}
      style={brandStyle}
    >
      <AppTopNav
        user={navUser}
        brand={{ nom: branding.nom, logoUrl: branding.logoUrl }}
        notifications={notifications}
      />
      <main className="mx-auto max-w-[1500px] p-4 md:p-6">{children}</main>
    </div>
  );
}
