import { cache } from "react";
import { PrismaClient } from "@prisma/client";
import { currentOrgVar } from "@/lib/rls-context";

// Singleton Prisma : évite de recréer des connexions en dev (hot-reload Next.js).
const globalForPrisma = globalThis as unknown as {
  prismaBase: PrismaClient | undefined;
};

/**
 * Client BRUT, non étendu. Socle interne : les clients cloisonnés
 * (`scopedPrisma`) et de contournement (`bypassPrisma`) l'étendent, et
 * `withOrgVar` / `txWithOrg` posent `app.org` dessus. NE PAS importer ailleurs :
 * le reste de l'app importe `prisma` (ci-dessous).
 */
export const prismaBase =
  globalForPrisma.prismaBase ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaBase = prismaBase;

const rlsOn = () => process.env.RLS_ENABLED === "true";
// Mode STRICT (par-dessus RLS_ENABLED) : le raw prisma cesse de tourner en
// BYPASS par défaut et se cloisonne sur l'organisme de la SESSION. Inerte tant
// que RLS_STRICT !== "true" → comportement historique (BYPASS par défaut).
const rlsStrict = () => process.env.RLS_STRICT === "true";

// Modèles cross-tenant PAR NATURE (authentification) : e-mail unique toutes
// organisations confondues, lus/écrits « par e-mail » lors du login et de la
// création de comptes apprenant → restent en BYPASS même en mode strict, sinon
// ces recherches globales renverraient 0 ligne. (Les GLOBAL_MODELS — Organisme,
// PlanTarif, SupportMessage — n'ont AUCUNE policy RLS, donc non concernés.)
const STRICT_GLOBAL_MODELS = new Set<string>(["User", "Apprenant"]);

const SET_ORG = `SELECT set_config('app.org', $1, true)`;

/**
 * Résout l'`app.org` du contexte de requête pour le mode strict : l'organisme
 * de la session courante, sinon "BYPASS" (SUPERADMIN sans organisme, flux public,
 * cron, build statique, script). Import dynamique de `@/auth` pour éviter le cycle
 * prisma↔auth ; `auth()` au runtime = décodage JWT (SANS base) → pas de récursion.
 * Mémoïsé par requête (React cache).
 */
const sessionOrgVar = cache(async (): Promise<string> => {
  try {
    const { auth } = await import("@/auth");
    const s = await auth();
    return s?.user?.organismeId ?? "BYPASS";
  } catch {
    return "BYPASS";
  }
});

/**
 * Exécute UNE opération Prisma dans une transaction qui pose d'abord
 * `app.org = value` (transaction-local, compatible pooler Neon). INERTE tant que
 * la RLS n'est pas activée → l'opération est renvoyée telle quelle (perf/comportement
 * historiques). `value` = organismeId (cloisonné) ou "BYPASS".
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withOrgVar<T>(value: string, op: any): Promise<T> {
  if (!rlsOn()) return op as Promise<T>;
  return prismaBase
    .$transaction([prismaBase.$executeRawUnsafe(SET_ORG, value), op])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then((r: any[]) => r[1] as T);
}

/**
 * Transaction atomique multi-opérations sous le bon `app.org`. Les opérations
 * doivent être construites sur `prismaBase` (client brut). `app.org` est posé en
 * PREMIÈRE instruction de la MÊME transaction → les ops suivantes le voient.
 * Hors RLS : simple `$transaction(ops)` (le set_config est omis). Renvoie les
 * résultats des `ops` (sans celui du set_config).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function txWithOrg<T = any[]>(value: string, ops: any[]): Promise<T> {
  if (!rlsOn()) return prismaBase.$transaction(ops) as Promise<T>;
  return prismaBase
    .$transaction([prismaBase.$executeRawUnsafe(SET_ORG, value), ...ops])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then((r: any[]) => r.slice(1) as unknown as T);
}

/**
 * Client Prisma par défaut, importé dans toute l'application. Identique au client
 * brut tant que `RLS_ENABLED` est désactivé. Une fois activé, chaque opération
 * pose `app.org` : contexte explicite (`runWithOrg`) sinon "BYPASS" (défaut
 * historique). Avec `RLS_STRICT=true` en plus, le défaut devient l'organisme de
 * la SESSION (cloisonnement base total sur le raw prisma), sauf `User`.
 */
export const prisma = prismaBase.$extends({
  query: {
    $allModels: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async $allOperations({ model, args, query }: any) {
        if (!rlsOn()) return query(args);
        // 1) Contexte explicite (runWithOrg / bypassPrisma) → prioritaire.
        const explicit = currentOrgVar();
        if (explicit) return withOrgVar(explicit, query(args));
        // 2) Mode historique : BYPASS par défaut sur le raw prisma.
        if (!rlsStrict()) return withOrgVar("BYPASS", query(args));
        // 3) Mode STRICT : cloisonne le raw prisma sur l'organisme de session,
        //    sauf les entités d'auth cross-tenant (User) laissées en BYPASS.
        if (STRICT_GLOBAL_MODELS.has(model)) return withOrgVar("BYPASS", query(args));
        return withOrgVar(await sessionOrgVar(), query(args));
      },
    },
  },
});
