import type { Session } from "next-auth";
import { auth } from "@/auth";
import { prismaBase, withOrgVar } from "@/lib/prisma";
import { SOFT_DELETE_MODELS, softWhere } from "@/lib/tenant-scope";

/**
 * Cloisonnement multi-tenant — DOUBLE garantie :
 *
 *  1. Couche applicative (toujours active) : `scopedPrisma(organismeId)` injecte
 *     automatiquement le `organismeId` du tenant courant en écriture, l'ajoute en
 *     filtre en lecture/maj/suppression, et vérifie l'appartenance sur les
 *     opérations « par identifiant unique ».
 *  2. Couche base (RLS PostgreSQL, si activée en prod) : chaque opération est
 *     exécutée dans une transaction qui pose d'abord la variable de session
 *     `app.org`, sur laquelle s'appuient les politiques RLS. Tant que la RLS n'est
 *     pas activée (rôle owner / dev), `set_config` est inoffensif → comportement
 *     inchangé. Cf. docs/PHASE3-RESIDUEL.md (conception validée).
 *
 * Le modèle `Organisme` (et tout modèle de GLOBAL_MODELS) n'est pas cloisonné. Le
 * client BRUT `prisma` reste utilisé pour l'authentification (login par e-mail) et,
 * via `bypassPrisma`, pour la console SUPERADMIN et les flux publics par token.
 */
const GLOBAL_MODELS = new Set<string>(["Organisme", "SupportMessage", "PlanTarif"]);

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

export function scopedPrisma(organismeId: string, opts?: { includeDeleted?: boolean }) {
  const includeDeleted = opts?.includeDeleted ?? false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const run = (op: any) => withOrgVar<any>(organismeId, op);
  // Délégué BRUT (non étendu) : évite la récursion de l'extension lors des
  // conversions soft-delete / vérifications d'appartenance.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (model: string) => (prismaBase as any)[delegateName(model)];

  return prismaBase.$extends({
    query: {
      $allModels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async $allOperations({ model, operation, args, query }: any) {
          if (GLOBAL_MODELS.has(model)) return query(args);

          // Modèle à corbeille ? (sauf en mode includeDeleted = corbeille elle-même)
          const soft = SOFT_DELETE_MODELS.has(model) && !includeDeleted;

          // ── Écritures ──
          // Sécurité : le organismeId du tenant est TOUJOURS placé en dernier
          // pour qu'un organismeId fourni dans args.data (payload client) ne
          // puisse jamais écraser celui de la session (défense en profondeur
          // isolation multi-tenant — audit P1, cf. SECURITY_TESTS/05_SERVER_ACTIONS.md).
          if (operation === "create") {
            args.data = { ...args.data, organismeId };
            return run(query(args));
          }
          if (operation === "createMany") {
            const rows = Array.isArray(args.data) ? args.data : [args.data];
            args.data = rows.map((d: Record<string, unknown>) => ({ ...d, organismeId }));
            return run(query(args));
          }
          if (operation === "upsert") {
            args.create = { ...args.create, organismeId };
            const existing = await run(
              raw(model).findFirst({ where: args.where, select: { organismeId: true } }),
            );
            if (existing && (existing as { organismeId?: string }).organismeId !== organismeId) {
              throw new Error("Accès refusé : ressource d'un autre organisme.");
            }
            return run(query(args));
          }

          // ── Soft-delete (corbeille) : delete/deleteMany → update(deletedAt) ──
          if (soft && operation === "deleteMany") {
            args.where = softWhere(args.where, organismeId, true);
            return run(raw(model).updateMany({ where: args.where, data: { deletedAt: new Date() } }));
          }
          if (soft && operation === "delete") {
            const target = await run(
              raw(model).findFirst({ where: softWhere(args.where, organismeId, true), select: { id: true } }),
            );
            if (!target) {
              throw new Error("Accès refusé : ressource introuvable pour cet organisme.");
            }
            const upd: Record<string, unknown> = {
              where: { id: (target as { id: string }).id },
              data: { deletedAt: new Date() },
            };
            if (args.select) upd.select = args.select;
            if (args.include) upd.include = args.include;
            return run(raw(model).update(upd));
          }

          // ── Filtres de masse : injection organismeId (+ exclusion corbeille si soft) ──
          if (WHERE_OPS.has(operation)) {
            args.where = softWhere(args.where, organismeId, soft);
            return run(query(args));
          }

          // ── Opérations par identifiant unique : vérification d'appartenance ──
          if (operation === "findUnique" || operation === "findUniqueOrThrow") {
            const d = raw(model);
            const fargs = { ...args, where: softWhere(args.where, organismeId, soft) };
            return run(operation === "findUniqueOrThrow" ? d.findFirstOrThrow(fargs) : d.findFirst(fargs));
          }
          if (operation === "update" || operation === "delete") {
            const exists = await run(
              raw(model).findFirst({ where: softWhere(args.where, organismeId, soft), select: { id: true } }),
            );
            if (!exists) {
              throw new Error("Accès refusé : ressource introuvable pour cet organisme.");
            }
            return run(query(args));
          }

          return run(query(args));
        },
      },
    },
  });
}

/**
 * Client en mode CONTOURNEMENT RLS (`app.org = 'BYPASS'`) — pour les accès
 * légitimes NON cloisonnés par session : console SUPERADMIN (cross-tenant), flux
 * publics par token (parcours, dossier…), crons. Inoffensif tant que la RLS n'est
 * pas activée. N'injecte PAS d'organismeId : le filtrage reste de la responsabilité
 * de l'appelant (par token unique, ou volontairement cross-tenant pour la console).
 */
export function bypassPrisma() {
  return prismaBase.$extends({
    query: {
      $allModels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async $allOperations({ args, query }: any) {
          return withOrgVar("BYPASS", query(args));
        },
      },
    },
  });
}

/**
 * Vérifie que la session correspond toujours à une session ACTIVE en base
 * (audit SEC-014 — révocation) : compte existant et `isActive`, et `sid` du token
 * égal à `activeSessionId` (dernière connexion). Coupe les Server Actions / routes
 * API pour un token révoqué (reset admin, désactivation, reprise sur un autre
 * appareil), là où le seul contrôle des layouts RSC ne s'appliquait pas.
 */
async function assertLiveSession(session: Session | null): Promise<void> {
  const uid = session?.user?.id;
  if (!uid) throw new Error("Session invalide.");
  const u = await prismaBase.user.findUnique({
    where: { id: uid },
    select: { isActive: true, activeSessionId: true, organisme: { select: { statut: true } } },
  });
  if (!u || !u.isActive) throw new Error("Compte désactivé ou introuvable.");
  // Suspension du tenant (impayé / essai échu passé en SUSPENDU par le cron) :
  // bloque toute Server Action et route de gestion — pas seulement le login
  // (audit A05-006/A05-013). Les données restent intactes ; seul l'accès du
  // personnel est coupé tant que l'organisme est SUSPENDU.
  if (u.organisme?.statut === "SUSPENDU") {
    throw new Error("Organisme suspendu : accès temporairement bloqué.");
  }
  const sid = (session!.user as { sid?: string | null }).sid ?? null;
  // sid null = token hérité (avant la « session unique ») → pas de blocage dessus.
  if (sid && u.activeSessionId && u.activeSessionId !== sid) {
    throw new Error("Session expirée : connexion depuis un autre appareil.");
  }
}

/** Client Prisma cloisonné sur l'organisme de l'utilisateur connecté. */
export async function getTenantDb(): Promise<TenantDb> {
  const session = await auth();
  await assertLiveSession(session);
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
  await assertLiveSession(session);
  const organismeId = session?.user?.organismeId ?? null;
  if (!organismeId) {
    throw new Error("Aucun organisme rattaché à la session.");
  }
  return { session, organismeId, db: scopedPrisma(organismeId) };
}

// Rôles à login mais NON-staff : élèves e-learning et formateurs. Ils ont un
// organisme rattaché, donc `getTenantDb()`/`requireTenant()` les laisserait
// invoquer les mutations de gestion via leur action-ID (BFLA — audit P2-1).
// ENTREPRISE (client B2B) est un tiers de l'OF, jamais du personnel : il ne doit
// pouvoir déclencher AUCUNE Server Action de gestion, même en forgeant la requête
// (il est déjà confiné à /espace-entreprise/* côté routes).
const NON_STAFF_ROLES = new Set(["APPRENANT", "FORMATEUR", "ENTREPRISE"]);

/**
 * Comme `requireTenant()`, mais réservé au PERSONNEL de l'organisme : rejette
 * les rôles APPRENANT/FORMATEUR (et tout accès sans organisme). À utiliser pour
 * les Server Actions de gestion (candidats, sessions, formations, e-mails…) afin
 * que l'autorisation par rôle ne dépende pas seulement de l'URL (le middleware
 * confine par URL, mais les Server Actions se dispatchent par action-ID).
 */
export async function requireStaffTenant() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  const organismeId = session?.user?.organismeId ?? null;
  if (!session?.user || !organismeId || !role || NON_STAFF_ROLES.has(role)) {
    throw new Error("Non autorisé : action réservée au personnel de l'organisme.");
  }
  await assertLiveSession(session);
  return { session, organismeId, role, db: scopedPrisma(organismeId) };
}

/**
 * Comme `requireStaffTenant()`, mais le client INCLUT les éléments en corbeille
 * (soft-deleted) — pour la corbeille : lister, restaurer, ou purger définitivement.
 * En mode `includeDeleted`, `delete` redevient une suppression DÉFINITIVE (purge).
 */
export async function requireTrashTenant() {
  const { session, organismeId, role } = await requireStaffTenant();
  return {
    session,
    organismeId,
    role,
    db: scopedPrisma(organismeId, { includeDeleted: true }),
  };
}
