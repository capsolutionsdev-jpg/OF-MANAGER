import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Cloisonnement multi-tenant.
 *
 * `scopedPrisma(organismeId)` renvoie un client Prisma qui injecte
 * automatiquement le `organismeId` du tenant courant :
 *  - en écriture (create / createMany / upsert.create) : pose l'organismeId ;
 *  - en lecture/maj/suppression de masse : ajoute le filtre organismeId ;
 *  - sur les opérations « par identifiant unique » (findUnique/update/delete) :
 *    vérifie d'abord que la ligne appartient bien au tenant (sinon refus),
 *    de façon à empêcher tout accès croisé entre organismes.
 *
 * Le modèle `Organisme` (et tout modèle listé dans GLOBAL_MODELS) n'est pas
 * cloisonné. Le client BRUT `prisma` reste utilisé pour l'authentification
 * (login par e-mail) et la console SUPERADMIN qui gère tous les tenants.
 */
// SupportMessage n'a pas d'organismeId : il est sécurisé via son ticket parent
// (SupportTicket, lui cloisonné). On l'exempte donc de l'injection automatique.
// PlanTarif est un référentiel global (tarifs des formules), pas une donnée
// tenant : on l'exempte du cloisonnement.
const GLOBAL_MODELS = new Set<string>(["Organisme", "SupportMessage", "PlanTarif"]);

// Opérations dont le `where` accepte des filtres non-uniques → injection directe.
const WHERE_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

function delegateName(model: string) {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

export type TenantDb = ReturnType<typeof scopedPrisma>;

export function scopedPrisma(organismeId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async $allOperations({ model, operation, args, query }: any) {
          if (GLOBAL_MODELS.has(model)) return query(args);

          // ── Écritures ──
          if (operation === "create") {
            args.data = { organismeId, ...args.data };
            return query(args);
          }
          if (operation === "createMany") {
            const rows = Array.isArray(args.data) ? args.data : [args.data];
            args.data = rows.map((d: Record<string, unknown>) => ({ organismeId, ...d }));
            return query(args);
          }
          if (operation === "upsert") {
            args.create = { organismeId, ...args.create };
            // garde-fou : si la ligne ciblée existe pour un AUTRE tenant, on refuse
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const existing = await (prisma as any)[delegateName(model)].findFirst({
              where: args.where,
              select: { organismeId: true },
            });
            if (existing && existing.organismeId !== organismeId) {
              throw new Error("Accès refusé : ressource d'un autre organisme.");
            }
            return query(args);
          }

          // ── Filtres de masse : injection directe du organismeId ──
          if (WHERE_OPS.has(operation)) {
            args.where = { ...(args.where ?? {}), organismeId };
            return query(args);
          }

          // ── Opérations par identifiant unique : vérification d'appartenance ──
          if (operation === "findUnique" || operation === "findUniqueOrThrow") {
            // findUnique n'accepte pas de filtre non-unique → on bascule en findFirst
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const d = (prisma as any)[delegateName(model)];
            const fargs = { ...args, where: { ...args.where, organismeId } };
            return operation === "findUniqueOrThrow" ? d.findFirstOrThrow(fargs) : d.findFirst(fargs);
          }
          if (operation === "update" || operation === "delete") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const exists = await (prisma as any)[delegateName(model)].findFirst({
              where: { ...args.where, organismeId },
              select: { id: true },
            });
            if (!exists) {
              throw new Error("Accès refusé : ressource introuvable pour cet organisme.");
            }
            return query(args);
          }

          return query(args);
        },
      },
    },
  });
}

/** Client Prisma cloisonné sur l'organisme de l'utilisateur connecté. */
export async function getTenantDb(): Promise<TenantDb> {
  const session = await auth();
  const organismeId = session?.user?.organismeId ?? null;
  if (!organismeId) {
    throw new Error(
      "Aucun organisme rattaché à la session (compte SUPERADMIN ou non connecté).",
    );
  }
  return scopedPrisma(organismeId);
}

/** Renvoie la session, l'organismeId et le client cloisonné. */
export async function requireTenant() {
  const session = await auth();
  const organismeId = session?.user?.organismeId ?? null;
  if (!organismeId) {
    throw new Error("Aucun organisme rattaché à la session.");
  }
  return { session, organismeId, db: scopedPrisma(organismeId) };
}
