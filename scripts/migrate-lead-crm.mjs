// Migration idempotente : champs CRM de prospection sortante sur Lead
// (fichiers Excel sécurité / transport). ADDITIF — colonnes nullables, aucune
// donnée existante touchée.
//   node scripts/migrate-lead-crm.mjs

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COLUMNS = [
  ["region", "TEXT"],
  ["departement", "TEXT"],
  ["codePostal", "TEXT"],
  ["ville", "TEXT"],
  ["adresse", "TEXT"],
  ["siteWeb", "TEXT"],
  ["siret", "TEXT"],
  ["representantLegal", "TEXT"],
  ["priorite", "TEXT"],
  ["typeFormation", "TEXT"],
  ["agrement", "TEXT"],
  ["agrementEchu", "BOOLEAN"],
  ["prochaineAction", "TEXT"],
  ["dateRelance", "TIMESTAMP(3)"],
  ["dateDernierContact", "TIMESTAMP(3)"],
  ["sourceRemarques", "TEXT"],
];

async function main() {
  for (const [col, type] of COLUMNS) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "${col}" ${type}`,
    );
  }
  // Index de travail (découpage + dédoublonnage par SIRET).
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Lead_siret_idx" ON "Lead" ("siret")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Lead_region_idx" ON "Lead" ("region")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Lead_departement_idx" ON "Lead" ("departement")`);
  console.log(`✅ ${COLUMNS.length} colonnes CRM Lead en place (+ index siret/region/departement).`);
}

main()
  .catch((e) => {
    console.error("❌ Échec migration :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
