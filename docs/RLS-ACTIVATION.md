# Activation de la RLS PostgreSQL (isolation multi-tenant) — Runbook

Objectif : passer d'un cloisonnement **applicatif** (déjà systématique, `src/lib/tenant.ts`) à une **double garantie** avec la Row Level Security PostgreSQL comme filet de sécurité au niveau base.

> **État actuel** : les policies sont **créées mais inertes**. L'application se connecte avec le rôle **propriétaire** des tables, qui *bypasse* la RLS. Rien ne change tant que les étapes 2–3 ci-dessous ne sont pas faites.

## Composants

- `prisma/sql/rls-policies.sql` — généré par `node scripts/gen-rls-sql.mjs` (70 tables tenant). `ENABLE ROW LEVEL SECURITY` + policy `tenant_isolation` :
  `"organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS'`.
  Le disjoncteur **`'BYPASS'`** est indispensable : sans lui, les accès légitimes non cloisonnés (console SUPERADMIN, flux publics par token, crons) renverraient 0 ligne.
- `src/lib/prisma.ts` — socle :
  - `prismaBase` = client BRUT non étendu (interne).
  - `withOrgVar(value, op)` / `txWithOrg(value, ops[])` = posent `set_config('app.org', value, true)` **dans la même transaction** que l'op (compatible pooler Neon). INERTES tant que `RLS_ENABLED≠true`.
  - `prisma` (importé partout) = `prismaBase` étendu : chaque opération BRUTE hérite de `app.org` du **contexte** (`runWithOrg`), défaut **"BYPASS"**.
- `src/lib/rls-context.ts` — `AsyncLocalStorage` portant `app.org`. `runWithOrg(value, fn)` restreint le raw prisma à un tenant ; `currentOrgVar()` lit la valeur. (`node:async_hooks` résolu au runtime serveur → sûr pour les bundles client.)
- `src/lib/tenant.ts` — `scopedPrisma(orgId)` (injection + garde d'appartenance) et `bypassPrisma()` (app.org="BYPASS"), tous deux bâtis sur `prismaBase`.
- `GLOBAL_MODELS` (`Organisme`, `SupportMessage`, `PlanTarif`) — non cloisonnés, sans policy.

### Sémantique du raw `prisma` (important)

Une fois `RLS_ENABLED=true`, un `prisma.x.op()` brut hors `runWithOrg` s'exécute en **"BYPASS"** (non-breaking : les 122 fichiers qui utilisent le prisma brut continuent de tourner). L'enforcement RLS est donc **réel et immédiat sur les chemins `getTenantDb`** (déjà cloisonnés), et **progressif** sur les chemins bruts : les envelopper dans `runWithOrg(organismeId, …)` (ou les migrer vers `getTenantDb`) resserre l'isolation tenant par tenant, sans big-bang.

> ⚠️ Transactions **tableau** (`$transaction([...])`) : passer par `txWithOrg(value, [prismaBase.x…])` (le client étendu ne peut pas batcher des ops déjà enveloppées). Les 5 occurrences du code sont déjà adaptées.

## Étape 1 — Créer les policies (additif, inerte) ✅ *appliqué*

```
node scripts/gen-rls-sql.mjs
# puis exécuter prisma/sql/rls-policies.sql sur la base (via DIRECT_URL)
```
Sans effet tant que l'app utilise le rôle propriétaire. **Rollback** : `DISABLE ROW LEVEL SECURITY` sur chaque table (script inverse) ou `DROP POLICY tenant_isolation`.

## Étape 2 — Créer le rôle applicatif non-owner `app_rls`

```sql
CREATE ROLE app_rls LOGIN PASSWORD '[secret]';
GRANT USAGE ON SCHEMA public TO app_rls;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rls;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rls;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rls;
-- app_rls n'est PAS propriétaire → la RLS s'applique à lui.
```

> Les migrations de schéma (`prisma db push`) restent faites avec le rôle **propriétaire** (owner), pas `app_rls`.

## Étape 3 — Basculer l'application sur `app_rls` + activer le flag

1. Créer une connexion Neon avec le rôle `app_rls` (pooled + direct).
2. Dans Vercel (Production) : `DATABASE_URL` → connexion `app_rls` (pooled). `DIRECT_URL` reste sur l'owner (migrations).
3. Poser `RLS_ENABLED=true`.
4. Redéployer.

À partir de là, chaque requête applicative passe par `set_config('app.org', …)` et la RLS filtre au niveau base.

## Étape 4 — Tests d'isolation (obligatoires avant d'ouvrir à des tiers)

> **Script automatique** : `node scripts/rls-check.mjs` (avec `RLS_OWNER_URL` + `RLS_APP_URL` = même base, rôles owner et app_rls) vérifie les 4 invariants : deny sans app.org, org A voit A, A ne voit pas B, BYPASS voit tout. À lancer sur une **branche de staging**.


- Connecté comme OF A, vérifier qu'aucune donnée d'OF B n'apparaît (candidats, sessions, factures, dashboard, exports).
- Tenter un accès par identifiant (URL directe) à une ressource d'un autre OF → 404/refus.
- Vérifier les **flux publics par token** (parcours, signer, satisfaction…) : ils utilisent le client brut (`bypassPrisma`) et filtrent par token — confirmer qu'ils fonctionnent toujours.
- Vérifier la **console SUPERADMIN** (accès cross-OF légitime) : elle doit rester en bypass.
- Vérifier crons/webhooks Stripe.

## Étape 5 — Rollback

**Coupe-circuit INSTANTANÉ (~1 min, recommandé)** : dans Vercel, remettre `DATABASE_URL` sur le rôle **owner** **et** `RLS_ENABLED=false`, puis redéployer. Le owner ignore la RLS → retour immédiat à l'état d'avant. Les policies restent en place (inertes pour l'owner) — rien d'autre à faire.

> ⚠️ Ne PAS se contenter de `RLS_ENABLED=false` en laissant `DATABASE_URL` sur `app_rls` : l'app ne poserait plus `app.org`, et `app_rls` (soumis à la RLS) verrait **0 ligne**. Le vrai coupe-circuit = **repasser DATABASE_URL sur l'owner**.

**Retrait COMPLET de la RLS (abandon définitif)** : exécuter `prisma/sql/rls-rollback.sql` (généré, `DROP POLICY` + `DISABLE ROW LEVEL SECURITY` sur les 70 tables) via le rôle owner.

> Fichier d'activation en un seul bloc (rôle + droits + policies) pour la prod : `prisma/sql/rls-prod-activate.sql`.

## Points d'attention

- `current_setting('app.org', true)` renvoie NULL si non posé → policy `= NULL` = **0 ligne** (deny par défaut) : tout chemin qui oublierait de poser `app.org` échouerait en lecture (sécurité, mais à valider en test).
- Prérequis **ARC-1** (`organismeId NOT NULL`) recommandé avant enforcement strict, pour éviter les lignes à `organismeId` NULL invisibles sous RLS.
- Pooler Neon en mode transaction : `set_config(…, true)` **transaction-local** — déjà géré par `withOrgVar` (une transaction par opération).
