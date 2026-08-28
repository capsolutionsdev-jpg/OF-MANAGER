/**
 * Identité de la version déployée, pour la traçabilité (endpoint /api/version,
 * badge discret en console). Sur Vercel, VERCEL_GIT_COMMIT_SHA / VERCEL_GIT_COMMIT_REF
 * sont fournis au build ET au runtime des fonctions ; hors Vercel, replis "dev"/"local".
 * BUILD_TIME est injecté par next.config au build (horodatage du déploiement).
 */
export function getVersionInfo(): { commit: string; ref: string; builtAt: string | null } {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  return {
    commit: sha ? sha.slice(0, 7) : "dev",
    ref: process.env.VERCEL_GIT_COMMIT_REF ?? "local",
    builtAt: process.env.BUILD_TIME ?? null,
  };
}
