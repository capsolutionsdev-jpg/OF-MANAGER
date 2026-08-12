/**
 * Vérifie l'isolation RLS sur une base donnée, avec le rôle applicatif app_rls.
 * À lancer sur une base de STAGING (jamais d'écriture — lectures seules).
 *
 * Usage (PowerShell) :
 *   $env:RLS_OWNER_URL="postgresql://neondb_owner:...@host/neondb?sslmode=require"
 *   $env:RLS_APP_URL="postgresql://app_rls:...@host/neondb?sslmode=require"   # même host, rôle app_rls
 *   node scripts/rls-check.mjs
 *
 * Vérifie 4 invariants :
 *   1. sans app.org            → 0 ligne (deny par défaut)
 *   2. app.org = orgA          → voit exactement les candidats de A
 *   3. app.org = orgA          → ne voit AUCUN candidat de B (pas de fuite)
 *   4. app.org = 'BYPASS'      → voit tout (console / crons / token)
 * Sort en code 0 si tout passe, 1 sinon.
 */
const OWNER = process.env.RLS_OWNER_URL;
const APP = process.env.RLS_APP_URL;
if (!OWNER || !APP) {
  console.error("Définis RLS_OWNER_URL (rôle owner) et RLS_APP_URL (rôle app_rls, MÊME base).");
  process.exit(2);
}

const { PrismaClient } = await import("@prisma/client");

// Vérité terrain via le rôle owner (bypasse la RLS).
const owner = new PrismaClient({ datasources: { db: { url: OWNER } } });
const rows = await owner.$queryRawUnsafe(
  `SELECT o.id, o.nom, count(c.id)::int AS n
   FROM "Organisme" o LEFT JOIN "Candidat" c ON c."organismeId" = o.id
   GROUP BY o.id, o.nom HAVING count(c.id) > 0 ORDER BY n DESC LIMIT 2`,
);
const total = (await owner.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "Candidat"`))[0].n;
await owner.$disconnect();
if (rows.length < 2) {
  console.error("Il faut au moins 2 organismes avec des candidats pour tester l'isolation.");
  process.exit(2);
}
const [A, B] = rows;
console.log(`Vérité terrain : A="${A.nom}"(${A.n}) · B="${B.nom}"(${B.n}) · total=${total}\n`);

// Tests avec le rôle app_rls (soumis à la RLS).
const app = new PrismaClient({ datasources: { db: { url: APP } } });
const count = (tx) => tx.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "Candidat"`).then((r) => r[0].n);
const setOrg = (tx, v) => tx.$executeRawUnsafe(`SELECT set_config('app.org', $1, true)`, v);

let fail = 0;
const check = (label, got, exp) => {
  const ok = got === exp;
  console.log(`  ${ok ? "OK  " : "FAIL"} ${label} → ${got} (attendu ${exp})`);
  if (!ok) fail++;
};

await app.$transaction(async (tx) => check("sans app.org (deny)", await count(tx), 0));
await app.$transaction(async (tx) => { await setOrg(tx, A.id); check("org A voit A", await count(tx), A.n); });
await app.$transaction(async (tx) => {
  await setOrg(tx, A.id);
  const leak = (await tx.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "Candidat" WHERE "organismeId"=$1`, B.id))[0].n;
  check("org A ne voit PAS B", leak, 0);
});
await app.$transaction(async (tx) => { await setOrg(tx, "BYPASS"); check("BYPASS voit tout", await count(tx), total); });
await app.$disconnect();

console.log(`\n=== ${fail === 0 ? "ISOLATION RLS OK" : fail + " ÉCHEC(S)"} ===`);
process.exit(fail === 0 ? 0 : 1);
