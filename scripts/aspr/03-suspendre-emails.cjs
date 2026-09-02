/**
 * CHANTIER 02 : suspend l'envoi automatique des e-mails pour les 2 tenants ASPR.
 * (coupe-circuit Organisme.emailsSuspendus, lu dans sendEmail). On réactivera
 * plus tard ; d'ici là tous les envois se feront MANUELLEMENT depuis l'audit.
 *
 *   node scripts/aspr/03-suspendre-emails.cjs           → SIMULATION
 *   node scripts/aspr/03-suspendre-emails.cjs --commit  → applique
 *   node scripts/aspr/03-suspendre-emails.cjs --commit --reactiver  → réactive
 */
const fs = require("fs");
const path = require("path");
try {
  for (const l of fs.readFileSync(path.join(process.cwd(), ".env"), "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); if (!process.env[m[1]]) process.env[m[1]] = v; }
  }
} catch { /* .env absent */ }
process.env.DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const COMMIT = process.argv.includes("--commit");
const SUSPENDRE = !process.argv.includes("--reactiver");

const TENANTS = [
  { org: "cmsrj9dyw0000l7041hv7dm86", nom: "ASPR Herblay" },
  { org: "cmtijd7350000jo0454cobb25", nom: "ASPR Neuilly" },
];

async function main() {
  console.log(`=== E-mails ASPR : ${SUSPENDRE ? "SUSPENSION" : "RÉACTIVATION"} ${COMMIT ? "(ÉCRITURE)" : "(SIMULATION)"} ===\n`);
  for (const t of TENANTS) {
    const org = await p.organisme.findUnique({ where: { id: t.org }, select: { nom: true, emailsSuspendus: true } });
    if (!org) { console.log(`⚠ ${t.nom} introuvable`); continue; }
    console.log(`${t.nom} : actuellement ${org.emailsSuspendus ? "SUSPENDU" : "ACTIF"} → ${SUSPENDRE ? "SUSPENDU" : "ACTIF"}`);
    if (COMMIT) await p.organisme.update({ where: { id: t.org }, data: { emailsSuspendus: SUSPENDRE } });
  }
  console.log(`\n${COMMIT ? "✅ Appliqué" : "SIMULATION"} — ${SUSPENDRE ? "aucun e-mail ne partira" : "e-mails réactivés"}.`);
  if (!COMMIT) console.log("→ Relancer avec --commit pour appliquer.");
  await p.$disconnect();
}
main().catch((e) => { console.error("ERREUR", e.message); process.exit(1); }).finally(() => p.$disconnect());
