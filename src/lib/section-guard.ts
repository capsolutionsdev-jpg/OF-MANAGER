import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessSection, roleAllowedInSection } from "@/lib/permissions";

/**
 * Garde d'autorisation serveur (défense en profondeur) à appeler en tête d'un
 * layout (ou d'une page) de section protégée.
 *
 * Vérifie à la fois :
 *  - le RÔLE : périmètre légitime de la section (cf. SECTION_ROLES) — bloque
 *    notamment FORMATEUR / APPRENANT sur les pages réservées au personnel ;
 *  - la PERMISSION : pour les collaborateurs staff, la section doit être cochée
 *    sur leur compte (cf. canAccessSection).
 *
 * Le middleware (auth.config.ts) applique déjà ce contrôle au niveau HTTP ;
 * cette garde le redouble côté rendu pour résister à toute régression du
 * middleware (ex. modification du matcher). Redirige vers /dashboard sinon.
 *
 * Retourne la session pour réutilisation par l'appelant.
 */
export async function requireSection(section: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Revalidation LIVE depuis la base : on ne se fie PAS au seul JWT (rôle,
  // permissions et fonctionnalités y sont figés à la connexion). Un changement
  // côté éditeur — retrait d'une permission/feature, désactivation du compte —
  // prend ainsi effet immédiatement (cf. audit ARC-04).
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      isActive: true,
      role: true,
      permissions: true,
      organisme: { select: { fonctionnalites: true } },
    },
  });
  if (!user || !user.isActive) redirect("/login");

  const { role, permissions } = user;
  if (
    !roleAllowedInSection(role, section) ||
    !canAccessSection(role, permissions, section)
  ) {
    redirect("/dashboard");
  }

  // Fonctionnalité désactivée pour l'organisme (liste vide = tout activé).
  const fonctionnalites = user.organisme?.fonctionnalites ?? [];
  if (fonctionnalites.length > 0 && !fonctionnalites.includes(section)) {
    redirect("/dashboard");
  }

  return session;
}

/**
 * Variante NON redirigeante de {@link requireSection} : retourne `true` si
 * l'utilisateur courant peut accéder à la section, `false` sinon. Utile pour
 * afficher/masquer une action côté serveur sans dérouter la page (le serveur
 * de l'action reste gardé par requireSection). Revalidation LIVE depuis la base.
 */
export async function userCanAccessSection(section: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      isActive: true,
      role: true,
      permissions: true,
      organisme: { select: { fonctionnalites: true } },
    },
  });
  if (!user || !user.isActive) return false;
  if (!roleAllowedInSection(user.role, section) || !canAccessSection(user.role, user.permissions, section)) {
    return false;
  }
  const fonctionnalites = user.organisme?.fonctionnalites ?? [];
  if (fonctionnalites.length > 0 && !fonctionnalites.includes(section)) return false;
  return true;
}
