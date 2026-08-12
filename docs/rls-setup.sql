-- ============================================================
-- RLS — bootstrap du rôle applicatif (étape 2 du runbook)
-- Les POLICIES ne sont PLUS ici : elles sont générées (source unique) dans
--   prisma/sql/rls-policies.sql  ←  `node scripts/gen-rls-sql.mjs`
-- Runbook complet : docs/RLS-ACTIVATION.md
-- ============================================================

-- Étape 2 — rôle applicatif dédié, NON propriétaire et SANS BYPASSRLS.
-- (Non-owner + NOBYPASSRLS = la RLS s'applique à lui ; le rôle OWNER, lui,
--  garde son bypass pour les migrations `prisma db push` et les seeds → on
--  n'utilise donc PAS `FORCE ROW LEVEL SECURITY`.)
--   Adapter le mot de passe avant exécution.

CREATE ROLE app_rls LOGIN PASSWORD 'CHANGE_ME' NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO app_rls;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rls;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rls;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rls;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_rls;

-- Étape 1 (policies) — exécuter le fichier généré :
--   psql "$DIRECT_URL" -f prisma/sql/rls-policies.sql
-- Étape 3 (bascule app) — Vercel : DATABASE_URL = connexion app_rls (pooled),
--   DIRECT_URL = owner (migrations), RLS_ENABLED=true, redéployer.
