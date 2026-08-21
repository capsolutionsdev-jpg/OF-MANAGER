// Migration idempotente : colonnes ContratPrestation pour options/packs/frais +
// offre « Pionniers » (Lot 2/3 — branchement devis). ADDITIF, sans perte.
//
//   node scripts/migrate-contrat-pionnier.mjs
//
// À lancer sur la base en même temps que le déploiement du code. 100 % raw SQL
// (ADD COLUMN IF NOT EXISTS) → idempotent, insensible au client Prisma.
// NB : lancer AUSSI scripts/migrate-formule-4-paliers.mjs (enum 4 paliers).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COLUMNS = [
  `ADD COLUMN IF NOT EXISTS "packs" TEXT[] NOT NULL DEFAULT '{}'`,
  `ADD COLUMN IF NOT EXISTS "fraisMiseEnService" INTEGER`,
  `ADD COLUMN IF NOT EXISTS "pionnier" BOOLEAN NOT NULL DEFAULT false`,
  `ADD COLUMN IF NOT EXISTS "pionnierVariante" TEXT`,
  `ADD COLUMN IF NOT EXISTS "prixGele" BOOLEAN NOT NULL DEFAULT false`,
];

async function main() {
  for (const col of COLUMNS) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ContratPrestation" ${col}`);
    console.log(`  ✓ ${col}`);
  }
  console.log("\n✅ Colonnes ContratPrestation (packs/frais/Pionniers) en place.");
}

main()
  .catch((e) => {
    console.error("❌ Échec migration :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
