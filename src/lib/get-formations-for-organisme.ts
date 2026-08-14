import { prisma } from "@/lib/prisma";
import { CATALOGUE_SECURITE, normaliserTitre } from "@/lib/catalogue-securite";

/**
 * Filtre une liste de formations (déjà chargées, déjà cloisonnées au tenant)
 * selon la sélection faite en console dev (Organisme.configurationsFormations,
 * clés de modèles de la bibliothèque).
 *
 * - Config vide → aucune restriction (toutes les formations du tenant).
 * - Le rapprochement se fait par TITRE normalisé (titre + alias du modèle),
 *   comme l'import de catalogue — la reference peut avoir été suffixée.
 * - Une formation créée à la main par l'organisme (hors bibliothèque) reste
 *   toujours visible : on ne masque que les formations de la bibliothèque
 *   qui ne sont pas cochées.
 */
export async function filterFormationsByOrgConfig<
  T extends { titre?: string | null; reference?: string | null },
>(organismeId: string, formations: T[]): Promise<T[]> {
  const org = await prisma.organisme.findUnique({
    where: { id: organismeId },
    select: { configurationsFormations: true },
  });

  const config = org?.configurationsFormations ?? [];
  if (config.length === 0) return formations;

  const selectionnees = new Set(config);
  const titresAutorises = new Set<string>();
  const titresBibliotheque = new Set<string>();

  for (const m of CATALOGUE_SECURITE) {
    const titres = [m.titre, ...m.alias].map(normaliserTitre);
    for (const t of titres) {
      titresBibliotheque.add(t);
      if (selectionnees.has(m.cle)) titresAutorises.add(t);
    }
  }

  return formations.filter((f) => {
    const titre = normaliserTitre(f.titre ?? "");
    // Hors bibliothèque (création manuelle du tenant) → toujours visible.
    if (!titresBibliotheque.has(titre)) return true;
    return titresAutorises.has(titre);
  });
}
