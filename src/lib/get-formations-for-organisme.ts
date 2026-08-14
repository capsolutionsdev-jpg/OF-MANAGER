import { prisma } from "@/lib/prisma";

/**
 * Récupère les formations qu'un organisme a configurées pour utiliser.
 * Si aucune configuration (array vide), retourne TOUTES les formations.
 * Sinon, filtre par slug (Formation.reference).
 */
export async function getFormationsForOrganisme(
  organismeId: string,
  baseFormations?: Array<{ id: string; reference?: string | null; [key: string]: unknown }>
) {
  // Charger la config de l'organisme
  const org = await prisma.organisme.findUnique({
    where: { id: organismeId },
    select: { configurationsFormations: true },
  });

  if (!org || org.configurationsFormations.length === 0) {
    // Pas de config = toutes les formations
    return baseFormations ?? [];
  }

  // Filtrer les formations par slug
  const allowedSlugs = new Set(org.configurationsFormations);
  return (baseFormations ?? []).filter((f) => f.reference && allowedSlugs.has(f.reference));
}

/**
 * Version pour les SELECT Prisma : retourne directement les formations filtrées.
 * Appeler APRÈS avoir chargé les formations avec Prisma.
 */
export async function filterFormationsByOrgConfig<
  T extends { reference?: string | null; [key: string]: unknown }
>(organismeId: string, formations: T[]): Promise<T[]> {
  const org = await prisma.organisme.findUnique({
    where: { id: organismeId },
    select: { configurationsFormations: true },
  });

  if (!org || org.configurationsFormations.length === 0) {
    return formations;
  }

  const allowedSlugs = new Set(org.configurationsFormations);
  return formations.filter((f) => f.reference && allowedSlugs.has(f.reference as string));
}
