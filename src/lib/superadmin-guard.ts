import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Garde de la console éditeur : réservée au rôle SUPERADMIN (compte développeur,
 * hors organisme). Tout autre rôle est renvoyé vers /dashboard.
 * Retourne la session pour réutilisation.
 */
export async function requireSuperAdmin() {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }
  return session;
}
