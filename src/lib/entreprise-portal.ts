import "server-only";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";

/**
 * Entreprise du user connecté (portail client). NULL si le compte n'est pas
 * rattaché à une entreprise. Le client BD est cloisonné par organisme ; on
 * filtre en plus par `userId` → un client ne voit QUE sa propre entreprise.
 */
export async function getCurrentEntreprise() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const db = await getTenantDb();
  return db.entreprise.findUnique({
    where: { userId: session.user.id },
    select: { id: true, raisonSociale: true },
  });
}
