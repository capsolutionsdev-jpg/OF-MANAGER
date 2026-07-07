import "server-only";
import { getCurrentOrganisme } from "@/lib/org";

/**
 * Le module « Examen civique » est RÉSERVÉ aux organismes qui ont explicitement
 * la fonctionnalité `examen-civique` (spécifique à CAP Compétences). Vérif
 * STRICTE : contrairement à `hasFeature`, une liste `fonctionnalites` vide ne
 * donne PAS accès (le module est un opt-in par tenant).
 */
export const EXAMEN_CIVIQUE_FEATURE = "examen-civique";

export async function hasExamenCivique(): Promise<boolean> {
  const org = await getCurrentOrganisme();
  return !!org?.fonctionnalites?.includes(EXAMEN_CIVIQUE_FEATURE);
}
