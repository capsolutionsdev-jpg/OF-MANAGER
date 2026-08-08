import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Garde de la console éditeur : réservée au rôle SUPERADMIN (compte développeur,
 * hors organisme). Tout autre rôle est renvoyé vers /dashboard.
 *
 * Revalide le rôle et l'état actif EN BASE (on ne se fie pas au seul JWT, figé à
 * la connexion) : une rétrogradation ou une désactivation prend effet immédiatement.
 * Retourne la session pour réutilisation.
 */
export async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isActive: true },
  });
  if (!user || !user.isActive || user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }
  return session;
}
