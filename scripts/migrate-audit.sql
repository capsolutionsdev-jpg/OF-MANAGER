-- Migration ADDITIVE : module Audit & contrôle des dossiers.
-- npx prisma db execute --file scripts/migrate-audit.sql --schema prisma/schema.prisma
DO $$ BEGIN CREATE TYPE "AuditControleType" AS ENUM ('INTERNE','CONTROLE','ALEATOIRE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AuditPerimetre" AS ENUM ('SESSION','DOSSIER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AuditControleStatut" AS ENUM ('EN_COURS','TERMINE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AuditDossierStatut" AS ENUM ('A_TRAITER','EN_COURS','CONFORME'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AuditControle" (
  "id" TEXT NOT NULL,
  "organismeId" TEXT,
  "type" "AuditControleType" NOT NULL,
  "perimetre" "AuditPerimetre" NOT NULL,
  "sessionId" TEXT,
  "titre" TEXT NOT NULL,
  "statut" "AuditControleStatut" NOT NULL DEFAULT 'EN_COURS',
  "responsableNom" TEXT,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuditControle_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AuditControle_organismeId_idx" ON "AuditControle"("organismeId");
CREATE INDEX IF NOT EXISTS "AuditControle_statut_idx" ON "AuditControle"("statut");

CREATE TABLE IF NOT EXISTS "AuditControleDossier" (
  "id" TEXT NOT NULL,
  "organismeId" TEXT,
  "auditId" TEXT NOT NULL,
  "inscriptionId" TEXT NOT NULL,
  "statut" "AuditDossierStatut" NOT NULL DEFAULT 'A_TRAITER',
  "relanceSentAt" TIMESTAMP(3),
  "relanceCount" INTEGER NOT NULL DEFAULT 0,
  "resolvedAt" TIMESTAMP(3),
  "commentaire" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuditControleDossier_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AuditControleDossier_auditId_inscriptionId_key" ON "AuditControleDossier"("auditId","inscriptionId");
CREATE INDEX IF NOT EXISTS "AuditControleDossier_organismeId_idx" ON "AuditControleDossier"("organismeId");
CREATE INDEX IF NOT EXISTS "AuditControleDossier_inscriptionId_idx" ON "AuditControleDossier"("inscriptionId");
DO $$ BEGIN
  ALTER TABLE "AuditControleDossier" ADD CONSTRAINT "AuditControleDossier_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "AuditControle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
