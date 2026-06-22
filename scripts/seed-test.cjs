// Seed de la BASE DE TEST (branche Neon dédiée). Provisionne 2 organismes
// (pour vérifier l'isolation) + un gérant chacun + données d'exemple.
// Sécurité : REFUSE de s'exécuter si DATABASE_URL_TEST n'est pas défini
// (empêche tout seed accidentel de la base de dev/prod).
const fs = require("fs");
const path = require("path");
for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const TEST_URL = process.env.DATABASE_URL_TEST;
if (!TEST_URL) {
  console.error("✋ DATABASE_URL_TEST non défini. Crée une branche Neon de test puis :");
  console.error('   DATABASE_URL_TEST="postgres://…" npx prisma db push');
  console.error('   DATABASE_URL_TEST="postgres://…" node scripts/seed-test.cjs');
  process.exit(1);
}
process.env.DATABASE_URL = TEST_URL;
process.env.DIRECT_URL = TEST_URL;

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const p = new PrismaClient();

async function org(nom, sousDomaine) {
  return p.organisme.upsert({
    where: { sousDomaine },
    update: {},
    create: { nom, sousDomaine, statut: "ACTIF", design: "defaut", couleurPrimaire: "#2C53C0" },
  });
}
async function admin(email, name, organismeId) {
  const passwordHash = await bcrypt.hash("Test1234!", 10);
  return p.user.upsert({
    where: { email },
    update: { organismeId, role: "ADMIN", isActive: true },
    create: { email, name, passwordHash, role: "ADMIN", isActive: true, organismeId },
  });
}

(async () => {
  const a = await org("Test OF A", "test-a");
  const b = await org("Test OF B", "test-b");
  await admin("admin-a@test.local", "Gérant A", a.id);
  await admin("admin-b@test.local", "Gérant B", b.id);

  // Donnée d'exemple côté A (candidat — champs sûrs). email n'étant pas unique
  // sur Candidat, on garde l'idempotence via un findFirst.
  const exists = await p.candidat.findFirst({ where: { email: "candidat-a@test.local", organismeId: a.id } });
  if (!exists) {
    await p.candidat.create({
      data: { organismeId: a.id, nom: "Martin", prenom: "Léa", email: "candidat-a@test.local" },
    });
  }

  console.log("✅ Base de test seedée :");
  console.log("   OF A:", a.id, "→ admin-a@test.local / Test1234!");
  console.log("   OF B:", b.id, "→ admin-b@test.local / Test1234!");
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
