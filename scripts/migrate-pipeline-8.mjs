// Migration idempotente : pipeline prospects 5 → 8 étapes + champs qualification
// (Lot 6). Enum LeadStatut renommé sans perte + 4 nouvelles étapes + colonnes.
//
//   node scripts/migrate-pipeline-8.mjs
//
// 100 % raw SQL (RENAME VALUE / ADD VALUE / ADD COLUMN IF NOT EXISTS) → idempotent,
// insensible au client Prisma. À lancer avec le déploiement du code.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RENAMES = [
  ["NOUVEAU", "FICHIER"],
  ["A_RAPPELER", "ENGAGE"],
  ["RAPPELE", "QUALIFIE"],
  ["CONVERTI", "SIGNE"],
];
const ADDS = ["CONTACTE", "DEMO_PLANIFIEE", "DEMO_REALISEE", "PROPOSITION"];
const COLUMNS = [
  `ADD COLUMN IF NOT EXISTS "verticale" TEXT`,
  `ADD COLUMN IF NOT EXISTS "outilActuel" TEXT`,
  `ADD COLUMN IF NOT EXISTS "echeanceQualiopi" TEXT`,
  `ADD COLUMN IF NOT EXISTS "volumeStagiairesMois" INTEGER`,
  `ADD COLUMN IF NOT EXISTS "malARemplir" BOOLEAN`,
  `ADD COLUMN IF NOT EXISTS "decideur" TEXT`,
];

async function labels() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT e.enumlabel AS label FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'LeadStatut'`,
  );
  return new Set(rows.map((r) => r.label));
}

async function main() {
  const l = await labels();
  console.log("Statuts actuels :", [...l].join(", ") || "(aucun)");

  for (const [oldN, newN] of RENAMES) {
    if (l.has(oldN) && !l.has(newN)) {
      await prisma.$executeRawUnsafe(`ALTER TYPE "LeadStatut" RENAME VALUE '${oldN}' TO '${newN}'`);
      console.log(`  ✓ ${oldN} → ${newN}`);
      l.delete(oldN);
      l.add(newN);
    } else {
      console.log(`  · ${oldN} → ${newN} : rien à faire`);
    }
  }
  for (const v of ADDS) {
    if (!l.has(v)) {
      await prisma.$executeRawUnsafe(`ALTER TYPE "LeadStatut" ADD VALUE IF NOT EXISTS '${v}'`);
      console.log(`  ✓ ajouté ${v}`);
    } else {
      console.log(`  · ${v} : déjà présent`);
    }
  }

  // Défaut de colonne aligné sur la 1re étape.
  await prisma.$executeRawUnsafe(`ALTER TABLE "Lead" ALTER COLUMN "statut" SET DEFAULT 'FICHIER'`);
  console.log("  ✓ défaut statut = FICHIER");

  for (const col of COLUMNS) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Lead" ${col}`);
    console.log(`  ✓ ${col}`);
  }

  console.log("\n✅ Pipeline 8 étapes + champs qualification en place.");
}

main()
  .catch((e) => {
    console.error("❌ Échec migration :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
