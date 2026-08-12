/**
 * Génère prisma/sql/rls-policies.sql à partir du schéma Prisma.
 * Sélectionne tous les modèles portant un champ `organismeId` (= tenant), hors
 * GLOBAL_MODELS, et émet pour chacun : ENABLE RLS + policy d'isolation
 * `"organismeId" = current_setting('app.org', true) OR app.org = 'BYPASS'`.
 *
 * Le disjoncteur `'BYPASS'` est INDISPENSABLE : `bypassPrisma()` pose
 * `app.org='BYPASS'` pour les accès légitimes non cloisonnés (console SUPERADMIN
 * cross-tenant, flux publics par token, crons). Sans lui, ces chemins
 * renverraient 0 ligne une fois la RLS active.
 *
 * INERTE tant que l'application se connecte avec le rôle propriétaire (owner)
 * de la table : PostgreSQL fait bypasser la RLS au propriétaire (sauf FORCE).
 * L'enforcement réel intervient avec le rôle non-owner `app_rls` (cf. runbook).
 *
 * Usage : node scripts/gen-rls-sql.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const GLOBAL_MODELS = new Set(["Organisme", "SupportMessage", "PlanTarif"]);

const schema = readFileSync("prisma/schema.prisma", "utf8");
const lines = schema.split(/\r?\n/);

const tenantModels = [];
let current = null;
let hasOrg = false;
for (const line of lines) {
  const m = line.match(/^model\s+(\w+)\s*\{/);
  if (m) { current = m[1]; hasOrg = false; continue; }
  if (current && /^\s*organismeId\s+String/.test(line)) hasOrg = true;
  if (current && /^\}/.test(line)) {
    if (hasOrg && !GLOBAL_MODELS.has(current)) tenantModels.push(current);
    current = null; hasOrg = false;
  }
}
tenantModels.sort();

const header = `-- ============================================================
-- RLS (Row Level Security) — isolation multi-tenant OFManager
-- GÉNÉRÉ par scripts/gen-rls-sql.mjs — NE PAS ÉDITER À LA MAIN.
-- ${tenantModels.length} tables tenant. Colonne de cloisonnement : "organismeId".
--
-- Inerte tant que l'application se connecte avec le rôle PROPRIÉTAIRE des tables
-- (le propriétaire bypasse la RLS). Enforcement réel = rôle non-owner \`app_rls\`
-- + bascule de DATABASE_URL + RLS_ENABLED=true. Voir docs/RLS-ACTIVATION.md.
-- ============================================================

`;

// Expression réutilisée en USING et WITH CHECK : la ligne appartient au tenant
// courant, OU on est en mode contournement légitime (app.org = 'BYPASS').
const PRED = `("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS')`;

const body = tenantModels
  .map(
    (t) => `-- ${t}
ALTER TABLE "${t}" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "${t}";
CREATE POLICY tenant_isolation ON "${t}"
  USING ${PRED}
  WITH CHECK ${PRED};
`,
  )
  .join("\n");

mkdirSync("prisma/sql", { recursive: true });
writeFileSync("prisma/sql/rls-policies.sql", header + body, "utf8");
console.log(`OK — ${tenantModels.length} tables → prisma/sql/rls-policies.sql`);
