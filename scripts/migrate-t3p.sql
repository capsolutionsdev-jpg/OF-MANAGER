-- Migration ADDITIVE du module « Parcours T3P » (Taxi/VTC — examen CMA).
-- Appliquée via : npx prisma db execute --file scripts/migrate-t3p.sql --schema prisma/schema.prisma
-- NE PAS utiliser `prisma db push` depuis la branche feat/parcours-t3p : la base
-- partagée porte aussi le schéma du chantier feat/commercialisation-demo (non
-- mergé) qu'un push effacerait (LeadEvent/LeadTask, colonnes démo Organisme/Lead).
-- Idempotent : IF NOT EXISTS / gardes sur les types.

DO $$ BEGIN
  CREATE TYPE "T3PMetier" AS ENUM ('TAXI', 'VTC');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ParcoursT3PStatut" AS ENUM ('EN_COURS', 'REUSSI', 'ABANDONNE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "T3PEpreuveType" AS ENUM ('THEORIE', 'PRATIQUE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "T3PEpreuveResultat" AS ENUM ('EN_ATTENTE', 'ADMIS', 'AJOURNE', 'ABSENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ParcoursT3P" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "candidatId" TEXT NOT NULL,
    "inscriptionId" TEXT,
    "metier" "T3PMetier" NOT NULL,
    "statut" "ParcoursT3PStatut" NOT NULL DEFAULT 'EN_COURS',
    "mobilite" BOOLEAN NOT NULL DEFAULT false,
    "permisBDate" TIMESTAMP(3),
    "conduiteAccompagnee" BOOLEAN NOT NULL DEFAULT false,
    "permisVerifieLe" TIMESTAMP(3),
    "casierVerifieLe" TIMESTAMP(3),
    "psc1VerifieLe" TIMESTAMP(3),
    "medicalDate" TIMESTAMP(3),
    "medicalVerifieLe" TIMESTAMP(3),
    "dossierCompletLe" TIMESTAMP(3),
    "cmaDepartement" TEXT,
    "cmaNumeroDossier" TEXT,
    "cmaInscritLe" TIMESTAMP(3),
    "fraisMontant" DECIMAL(10,2),
    "fraisPayesLe" TIMESTAMP(3),
    "fraisAvancesParOF" BOOLEAN NOT NULL DEFAULT false,
    "formationTheoriqueFaiteLe" TIMESTAMP(3),
    "formationPratiqueFaiteLe" TIMESTAMP(3),
    "admissibiliteLe" TIMESTAMP(3),
    "carteProDemandeeLe" TIMESTAMP(3),
    "carteProObtenueLe" TIMESTAMP(3),
    "carteProNumero" TEXT,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParcoursT3P_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "T3PEpreuve" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "parcoursId" TEXT NOT NULL,
    "type" "T3PEpreuveType" NOT NULL,
    "tentative" INTEGER NOT NULL DEFAULT 1,
    "convocationRecueLe" TIMESTAMP(3),
    "date" TIMESTAMP(3),
    "resultat" "T3PEpreuveResultat" NOT NULL DEFAULT 'EN_ATTENTE',
    "resultatLe" TIMESTAMP(3),
    "note" TEXT,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "T3PEpreuve_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ParcoursT3P_inscriptionId_key" ON "ParcoursT3P"("inscriptionId");
CREATE INDEX IF NOT EXISTS "ParcoursT3P_organismeId_idx" ON "ParcoursT3P"("organismeId");
CREATE INDEX IF NOT EXISTS "ParcoursT3P_statut_idx" ON "ParcoursT3P"("statut");
CREATE UNIQUE INDEX IF NOT EXISTS "ParcoursT3P_candidatId_metier_key" ON "ParcoursT3P"("candidatId", "metier");
CREATE INDEX IF NOT EXISTS "T3PEpreuve_organismeId_idx" ON "T3PEpreuve"("organismeId");
CREATE UNIQUE INDEX IF NOT EXISTS "T3PEpreuve_parcoursId_type_tentative_key" ON "T3PEpreuve"("parcoursId", "type", "tentative");

DO $$ BEGIN
  ALTER TABLE "ParcoursT3P" ADD CONSTRAINT "ParcoursT3P_candidatId_fkey" FOREIGN KEY ("candidatId") REFERENCES "Candidat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ParcoursT3P" ADD CONSTRAINT "ParcoursT3P_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "T3PEpreuve" ADD CONSTRAINT "T3PEpreuve_parcoursId_fkey" FOREIGN KEY ("parcoursId") REFERENCES "ParcoursT3P"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
