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
 *
 * `node:async_hooks` est résolu au RUNTIME serveur (require masqué du bundler) :
 * ce module est transitivement importé par des composants client via la chaîne
 * `@/lib/prisma`. Un import statique `node:async_hooks` casserait leur bundle.
 * Côté client, l'AsyncLocalStorage est absent → no-op (prisma n'y tourne jamais).
 */
type OrgStore = { org: string };

type ALS = {
  run<R>(store: OrgStore, cb: () => R): R;
  getStore(): OrgStore | undefined;
};

let cached: ALS | null | undefined;

function storage(): ALS | null {
  if (cached !== undefined) return cached;
  cached = null;
  try {
    const req = eval("require") as (m: string) => { AsyncLocalStorage: new () => ALS };
    const { AsyncLocalStorage } = req("node:async_hooks");
    cached = new AsyncLocalStorage();
  } catch {
    cached = null; // bundle client / runtime sans async_hooks → no-op
  }
  return cached;
}

/**
 * Exécute `fn` avec `app.org = value` (organismeId ou "BYPASS") posé pour tout
 * accès Prisma BRUT effectué à l'intérieur (hérité via AsyncLocalStorage).
 */
export function runWithOrg<T>(value: string, fn: () => Promise<T>): Promise<T> {
  const s = storage();
  return s ? s.run({ org: value }, fn) : fn();
}

/** Valeur `app.org` du contexte courant, sinon `undefined`. */
export function currentOrgVar(): string | undefined {
  return storage()?.getStore()?.org;
}
