import "server-only";
import { Prisma } from "@prisma/client";
import { reportError } from "@/lib/observability/report-error";

// Type de retour standard des Server Actions (cf. audit BCK-03/FRT-01).
// Permet à l'UI d'afficher un retour cohérent (toast succès/erreur) au lieu de
// l'échec muet des actions qui renvoyaient `void`.
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Convertit une erreur quelconque en message utilisateur sûr.
 * - mappe les erreurs Prisma connues (unicité, introuvable) ;
 * - reconnaît les refus du cloisonnement multi-tenant (`scopedPrisma`) ;
 * - journalise le détail côté serveur, n'expose qu'un message générique sinon.
 */
export function toActionError(e: unknown): { ok: false; error: string } {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return { ok: false, error: "Une entrée identique existe déjà." };
    if (e.code === "P2025") return { ok: false, error: "Ressource introuvable." };
  }
  if (e instanceof Error && e.message.startsWith("Accès refusé")) {
    return { ok: false, error: "Accès refusé." };
  }
  // Erreur INATTENDUE (ni Prisma connue, ni refus de cloisonnement) → incident :
  // report best-effort (logs structurés + Sentry si configuré), sans bloquer le
  // retour utilisateur. reportError journalise déjà en console.
  void reportError(e, { tag: "action" });
  return { ok: false, error: "Une erreur est survenue. Réessayez." };
}
