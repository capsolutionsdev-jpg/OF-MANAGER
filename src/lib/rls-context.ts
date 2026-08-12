import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Contexte d'exécution RLS — porte la valeur `app.org` (= organismeId, ou le
 * sentinelle "BYPASS") à travers la pile d'appels asynchrones. Le client Prisma
 * BRUT (`prisma`, cf. lib/prisma.ts) la lit pour poser `set_config('app.org', …)`
 * sur chaque opération quand la RLS est active.
 *
 * Défaut hors contexte = "BYPASS" (non-breaking) : un accès brut qui n'a pas
 * explicitement posé d'organisme reste servi (comportement historique). Poser un
 * organisme via `runWithOrg` RESTREINT alors le raw prisma à ce tenant — c'est le
 * levier pour resserrer progressivement l'enforcement RLS sur les chemins bruts.
 */
type OrgStore = { org: string };

const storage = new AsyncLocalStorage<OrgStore>();

/**
 * Exécute `fn` avec `app.org = value` (organismeId ou "BYPASS") posé pour tout
 * accès Prisma BRUT effectué à l'intérieur (hérité via AsyncLocalStorage).
 */
export function runWithOrg<T>(value: string, fn: () => Promise<T>): Promise<T> {
  return storage.run({ org: value }, fn);
}

/** Valeur `app.org` du contexte courant, sinon `undefined`. */
export function currentOrgVar(): string | undefined {
  return storage.getStore()?.org;
}
