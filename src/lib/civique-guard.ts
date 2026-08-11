import "server-only";

/**
 * Module « Examen civique » RETIRÉ (CAP Compétences ne l'utilise plus).
 * La fonction est conservée car elle est référencée par le layout et les routes
 * d'export du module ; elle refuse désormais l'accès pour tous → menu masqué
 * (cf. navigation) et routes/API `examen-civique` redirigées vers le tableau
 * de bord. Réactivation éventuelle = rétablir la vérification par fonctionnalité.
 */
export const EXAMEN_CIVIQUE_FEATURE = "examen-civique";

export function hasExamenCivique(): Promise<boolean> {
  return Promise.resolve(false);
}
