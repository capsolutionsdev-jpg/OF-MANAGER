/**
 * Compte, pour chaque table tenant, les lignes où "organismeId" IS NULL.
 * Prérequis à ARC-1 (passage organismeId NOT NULL) : le NOT NULL n'est
 * applicable que si toutes ces valeurs valent 0. Lecture seule, via DIRECT_URL.
 * Usage : node scripts/check-null-org.mjs
 */
import { readFileSync } from "node:fs";

const GLOBAL_MODELS = new Set(["Organisme", "SupportMessage", "PlanTarif"]);

const env = {};
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
  if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); env[m[1]] = v; }
}
process.env.DATABASE_URL = env.DIRECT_URL || env.DATABASE_URL;

// Tables tenant depuis le schéma
const schema = readFileSync("prisma/schema.prisma", "utf8").split(/\r?\n/);
const tables = [];
let cur = null, hasOrg = false;
for (const l of schema) {
  const m = l.match(/^model\s+(\w+)\s*\{/);
  if (m) { cur = m[1]; hasOrg = false; continue; }
  if (cur && /^\s*organismeId\s+String/.test(l)) hasOrg = true;
  if (cur && /^\}/.test(l)) { if (hasOrg && !GLOBAL_MODELS.has(cur)) tables.push(cur); cur = null; hasOrg = false; }
}

const { PrismaClient } = await import("@prisma/client");
const p = new PrismaClient();
async function withRetry(fn, n = 4) { for (let i = 0; i < n; i++) { try { return await fn(); } catch (e) { if (i === n - 1) throw e; await new Promise((r) => setTimeout(r, 2500)); } } }
await withRetry(() => p.$queryRawUnsafe("SELECT 1"));

let total = 0;
const offenders = [];
for (const t of tables) {
  const r = await p.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${t}" WHERE "organismeId" IS NULL`);
  const n = r[0].n;
  total += n;
  if (n > 0) offenders.push(`${t}: ${n}`);
}
console.log(`Tables tenant analysées : ${tables.length}`);
console.log(`Lignes organismeId NULL au total : ${total}`);
if (offenders.length) { console.log("À corriger :"); offenders.forEach((o) => console.log("  - " + o)); }
else console.log("✅ Aucune ligne NULL — passage NOT NULL applicable.");
await p.$disconnect();
