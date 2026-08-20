/**
 * Chemins autorisés pour un compte ENTREPRISE (confinement du portail client).
 * Fonction PURE (utilisable dans le middleware edge — aucune dépendance runtime).
 */
export function isEntrepriseAllowedPath(path: string): boolean {
  return path === "/espace-entreprise" || path.startsWith("/espace-entreprise/");
}
