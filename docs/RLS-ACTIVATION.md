# Activation de la RLS PostgreSQL (isolation multi-tenant) — Runbook

Objectif : passer d'un cloisonnement **applicatif** (déjà systématique, `src/lib/tenant.ts`) à une **double garantie** avec la Row Level Security PostgreSQL comme filet de sécurité au niveau base.

> **État actuel** : les policies sont **créées mais inertes**. L'application se connecte avec le rôle **propriétaire** des tables, qui *bypasse* la RLS. Rien ne change tant que les étapes 2–3 ci-dessous ne sont pas faites.

## Composants

- `prisma/sql/rls-policies.sql` — généré par `node scripts/gen-rls-sql.mjs` (60 tables tenant). `ENABLE ROW LEVEL SECURITY` + policy `tenant_isolation` : `"organismeId" = current_setting('app.org', true)`.
- `src/lib/tenant.ts` — `withOrgVar()` pose `set_config('app.org', <organismeId>, true)` **par transaction** quand `RLS_ENABLED=true` (inerte sinon). Compatible pooler Neon (PgBouncer transaction mode).
- `GLOBAL_MODELS` (`Organisme`, `SupportMessage`, `PlanTarif`) — non cloisonnés, sans policy.

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

- Connecté comme OF A, vérifier qu'aucune donnée d'OF B n'apparaît (candidats, sessions, factures, dashboard, exports).
- Tenter un accès par identifiant (URL directe) à une ressource d'un autre OF → 404/refus.
- Vérifier les **flux publics par token** (parcours, signer, satisfaction…) : ils utilisent le client brut (`bypassPrisma`) et filtrent par token — confirmer qu'ils fonctionnent toujours.
- Vérifier la **console SUPERADMIN** (accès cross-OF légitime) : elle doit rester en bypass.
- Vérifier crons/webhooks Stripe.

## Étape 5 — Rollback rapide

En cas d'anomalie : repasser `RLS_ENABLED=false` **et** `DATABASE_URL` sur le rôle owner, redéployer. Les policies peuvent rester en place (inertes pour l'owner).

## Points d'attention

- `current_setting('app.org', true)` renvoie NULL si non posé → policy `= NULL` = **0 ligne** (deny par défaut) : tout chemin qui oublierait de poser `app.org` échouerait en lecture (sécurité, mais à valider en test).
- Prérequis **ARC-1** (`organismeId NOT NULL`) recommandé avant enforcement strict, pour éviter les lignes à `organismeId` NULL invisibles sous RLS.
- Pooler Neon en mode transaction : `set_config(…, true)` **transaction-local** — déjà géré par `withOrgVar` (une transaction par opération).
