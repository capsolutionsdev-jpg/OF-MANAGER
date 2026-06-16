import { redirect } from "next/navigation";
import { auth } from "@/auth";
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
  const role = session?.user?.role;
  const permissions = session?.user?.permissions ?? [];
  if (
    !role ||
    !roleAllowedInSection(role, section) ||
    !canAccessSection(role, permissions, section)
  ) {
    redirect("/dashboard");
  }
  return session;
}
