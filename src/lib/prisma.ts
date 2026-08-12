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

const SET_ORG = `SELECT set_config('app.org', $1, true)`;

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
 * brut tant que la RLS est désactivée. Une fois `RLS_ENABLED=true`, chaque
 * opération hérite de `app.org` depuis le contexte AsyncLocalStorage
 * (`runWithOrg`), avec pour défaut "BYPASS" — cf. lib/rls-context.ts.
 */
export const prisma = prismaBase.$extends({
  query: {
    $allModels: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async $allOperations({ args, query }: any) {
        if (!rlsOn()) return query(args);
        return withOrgVar(currentOrgVar() ?? "BYPASS", query(args));
      },
    },
  },
});
