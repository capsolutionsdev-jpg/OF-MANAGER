import { prisma } from "@/lib/prisma";
import { normaliserTitre } from "@/lib/catalogue-securite";
import { BIBLIOTHEQUE_FORMATIONS, migrerSlugs } from "@/lib/formations-catalog";

/**
 * Filtre une liste de formations (déjà chargées, déjà cloisonnées au tenant)
 * selon la sélection faite en console dev (Organisme.configurationsFormations,
 * clés de modèles de la bibliothèque sécurité + transport).
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
  // Migration des identifiants (alias anciens → clés actuelles) + filtrage aux
  // clés connues : une config héritée d'une ancienne version reste valide au lieu
  // d'être silencieusement ignorée. Config totalement inconnue → aucune
  // restriction (on ne masque jamais le catalogue du tenant par erreur).
  const connus = migrerSlugs(config);
  if (connus.length === 0) return formations;

  const selectionnees = new Set(connus);
  const titresAutorises = new Set<string>();
  const titresBibliotheque = new Set<string>();

  for (const m of BIBLIOTHEQUE_FORMATIONS) {
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
