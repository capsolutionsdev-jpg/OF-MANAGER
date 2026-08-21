// Migration idempotente : solde SMS prépayé par organisme (Lot 8). ADDITIF.
//   node scripts/migrate-sms-solde.mjs

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Organisme" ADD COLUMN IF NOT EXISTS "smsSolde" INTEGER NOT NULL DEFAULT 0`,
  );
  console.log("✅ Colonne Organisme.smsSolde en place.");
}

main()
  .catch((e) => {
    console.error("❌ Échec migration :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
