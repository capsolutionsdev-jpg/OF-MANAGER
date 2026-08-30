// Constantes et helpers PURS de cloisonnement multi-tenant (aucune dépendance
// runtime : ni Prisma, ni auth, ni server-only) → testables isolément.
// Importés par src/lib/tenant.ts.

/**
 * Modèles dotés d'une corbeille (soft-delete, audit A09-003) : via `scopedPrisma`,
 * un `delete`/`deleteMany` pose `deletedAt` au lieu de supprimer, et les lectures
 * excluent les éléments en corbeille. Les hard-deletes légitimes (crons, scripts,
 * console SUPERADMIN, flux publics par token) passent par `bypassPrisma` / le client
 * brut et ne sont donc PAS convertis. La corbeille (liste/restauration/purge) utilise
 * le mode `includeDeleted`.
 */
export const SOFT_DELETE_MODELS = new Set<string>([
  "Candidat",
  "Session",
  "Inscription",
  "Entreprise",
  "Facture",
]);

/**
 * (Pur, testable) Construit le `where` cloisonné : le `organismeId` du tenant est
 * TOUJOURS placé APRÈS le where fourni (un `organismeId` présent dans le payload
 * client ne peut donc jamais l'écraser — défense en profondeur isolation), et on
 * exclut la corbeille (`deletedAt: null`) quand `soft` est vrai.
 */
export function softWhere(
  baseWhere: Record<string, unknown> | undefined,
  organismeId: string,
  soft: boolean,
): Record<string, unknown> {
  return { ...(baseWhere ?? {}), organismeId, ...(soft ? { deletedAt: null } : {}) };
}
