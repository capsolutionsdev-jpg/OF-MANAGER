// Migration idempotente : module « Circuits d'automatisation » (studio visuel).
// ADDITIF — 3 enums + 3 tables neuves, aucune donnée existante touchée.
//   node scripts/migrate-circuits.mjs

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Enums (idempotents).
  await prisma.$executeRawUnsafe(`DO $$ BEGIN CREATE TYPE "CircuitAncre" AS ENUM ('DEBUT','FIN'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
  await prisma.$executeRawUnsafe(`DO $$ BEGIN CREATE TYPE "CircuitAudience" AS ENUM ('APPRENANT','ENTREPRISE','FORMATEUR'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
  await prisma.$executeRawUnsafe(`DO $$ BEGIN CREATE TYPE "CircuitActionType" AS ENUM ('EMAIL','DOCUMENT','ESIGN','EVALUATION','SATISFACTION','AUTO_EVALUATION'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Circuit" (
      "id" TEXT PRIMARY KEY,
      "organismeId" TEXT NOT NULL,
      "nom" TEXT NOT NULL,
      "description" TEXT,
      "actif" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Circuit_organismeId_idx" ON "Circuit" ("organismeId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Circuit_actif_idx" ON "Circuit" ("actif")`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CircuitStep" (
      "id" TEXT PRIMARY KEY,
      "circuitId" TEXT NOT NULL,
      "ordre" INTEGER NOT NULL DEFAULT 0,
      "ancre" "CircuitAncre" NOT NULL DEFAULT 'DEBUT',
      "offsetJours" INTEGER NOT NULL DEFAULT 0,
      "audience" "CircuitAudience" NOT NULL DEFAULT 'APPRENANT',
      "typeAction" "CircuitActionType" NOT NULL,
      "titre" TEXT,
      "emailSujet" TEXT,
      "emailCorps" TEXT,
      "documentType" TEXT,
      "config" JSONB,
      CONSTRAINT "CircuitStep_circuitId_fkey" FOREIGN KEY ("circuitId") REFERENCES "Circuit"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CircuitStep_circuitId_idx" ON "CircuitStep" ("circuitId")`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CircuitStepRun" (
      "id" TEXT PRIMARY KEY,
      "stepId" TEXT NOT NULL,
      "circuitId" TEXT NOT NULL,
      "inscriptionId" TEXT NOT NULL,
      "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "statut" TEXT NOT NULL DEFAULT 'ENVOYE',
      CONSTRAINT "CircuitStepRun_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "CircuitStep"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "CircuitStepRun_stepId_inscriptionId_key" ON "CircuitStepRun" ("stepId","inscriptionId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CircuitStepRun_inscriptionId_idx" ON "CircuitStepRun" ("inscriptionId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CircuitStepRun_circuitId_idx" ON "CircuitStepRun" ("circuitId")`);

  console.log("✅ Module Circuits : 3 enums + 3 tables (Circuit / CircuitStep / CircuitStepRun) en place.");
}

main()
  .catch((e) => {
    console.error("❌ Échec migration :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
