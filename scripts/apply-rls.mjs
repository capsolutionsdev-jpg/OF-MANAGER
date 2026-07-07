/**
 * Applique prisma/sql/rls-policies.sql sur la base, en TRANSACTION (tout-ou-rien),
 * via DIRECT_URL (joignable). Additif et inerte tant que l'app utilise le rôle
 * propriétaire. Usage : node scripts/apply-rls.mjs
 */
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
  if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); env[m[1]] = v; }
}
process.env.DATABASE_URL = env.DIRECT_URL || env.DATABASE_URL;

const sql = readFileSync("prisma/sql/rls-policies.sql", "utf8");
// Retire les commentaires ligne, découpe sur ';'
const statements = sql
  .split("\n")
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

const { PrismaClient } = await import("@prisma/client");
const p = new PrismaClient();
async function withRetry(fn, n = 4) {
  for (let i = 0; i < n; i++) {
    try { return await fn(); }
    catch (e) { if (i === n - 1) throw e; console.log(`  réveil endpoint… (${i + 1})`); await new Promise((r) => setTimeout(r, 2500)); }
  }
}
await withRetry(() => p.$queryRawUnsafe("SELECT 1"));
await p.$transaction(statements.map((s) => p.$executeRawUnsafe(s)));
console.log(`OK — ${statements.length} instructions appliquées (RLS créée, inerte pour le rôle owner).`);
await p.$disconnect();
