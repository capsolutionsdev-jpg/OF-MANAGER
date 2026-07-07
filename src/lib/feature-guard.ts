import "server-only";
import { getCurrentOrganisme } from "@/lib/org";

/**
 * Vérification STRICTE d'une fonctionnalité pour l'organisme courant.
 * Contrairement à `hasFeature` (permissif : liste vide = tout activé), un module
 * gardé ici est un opt-in : absent de `fonctionnalites` ⇒ pas d'accès.
 * Utilisé par les modules réservés (examen-civique, diplômes, jurys…).
 */
export async function hasStrictFeature(key: string): Promise<boolean> {
  const org = await getCurrentOrganisme();
  return !!org?.fonctionnalites?.includes(key);
}
