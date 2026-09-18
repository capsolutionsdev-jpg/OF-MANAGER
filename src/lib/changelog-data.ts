import "server-only";
import { prisma } from "@/lib/prisma";
import { clientView, sortReleasesDesc, type ChangelogRelease } from "@/lib/changelog";

/**
 * Lectures du changelog (modèle GLOBAL, hors tenant). Utilise le client `prisma`
 * par défaut — même précédent que `pricing.ts` pour `PlanTarif`. Ce fichier n'est
 * PAS dans `src/lib/actions/` : il échappe donc légitimement au garde prisma direct.
 */

/** Toutes les versions (brouillons inclus) pour la console éditeur, triées. */
export async function listReleasesForConsole(): Promise<ChangelogRelease[]> {
  const rows = await prisma.release.findMany({
    include: { entries: { orderBy: { order: "asc" } } },
  });
  return sortReleasesDesc(rows as unknown as ChangelogRelease[]);
}

/** Versions publiées + entrées d'audience CLIENT uniquement (page « Nouveautés »). */
export async function listPublishedClientReleases(): Promise<ChangelogRelease[]> {
  const rows = await prisma.release.findMany({
    where: { releasedAt: { not: null, lte: new Date() } },
    include: { entries: { where: { audience: "CLIENT" }, orderBy: { order: "asc" } } },
  });
  return clientView(rows as unknown as ChangelogRelease[]);
}
