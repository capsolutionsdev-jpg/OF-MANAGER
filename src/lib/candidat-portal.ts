import "server-only";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";

/**
 * Dossier apprenant du candidat connecté (portail candidat). NULL si le compte
 * n'est pas rattaché à un dossier apprenant. Toutes les requêtes du portail
 * filtrent ensuite sur `candidatId` → un candidat ne voit QUE ses données.
 */
export async function getCurrentApprenant() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const db = await getTenantDb();
  return db.apprenant.findUnique({
    where: { userId: session.user.id },
    select: { id: true, candidatId: true },
  });
}

/** Catégorise une session par rapport à aujourd'hui. */
export function sessionPhase(dateDebut: Date, dateFin: Date): "AVENIR" | "EN_COURS" | "TERMINEE" {
  const now = Date.now();
  if (dateFin.getTime() < now) return "TERMINEE";
  if (dateDebut.getTime() > now) return "AVENIR";
  return "EN_COURS";
}
