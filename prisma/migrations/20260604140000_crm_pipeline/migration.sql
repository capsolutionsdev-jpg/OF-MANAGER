-- CRM commercial : pipeline (crmStage), tags, opportunité, relance, affectation, interactions

-- 1) Colonnes CRM sur le candidat
ALTER TABLE "Candidat" ADD COLUMN IF NOT EXISTS "crmStage" "CrmStage" NOT NULL DEFAULT 'NOUVEAU';
ALTER TABLE "Candidat" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Candidat" ADD COLUMN IF NOT EXISTS "valeurEstimee" DECIMAL(10,2);
ALTER TABLE "Candidat" ADD COLUMN IF NOT EXISTS "relanceDate" TIMESTAMP(3);
ALTER TABLE "Candidat" ADD COLUMN IF NOT EXISTS "assignedToId" TEXT;

CREATE INDEX IF NOT EXISTS "Candidat_crmStage_idx" ON "Candidat"("crmStage");
CREATE INDEX IF NOT EXISTS "Candidat_assignedToId_idx" ON "Candidat"("assignedToId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Candidat_assignedToId_fkey'
  ) THEN
    ALTER TABLE "Candidat"
      ADD CONSTRAINT "Candidat_assignedToId_fkey"
      FOREIGN KEY ("assignedToId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

-- 2) Table des interactions commerciales
CREATE TABLE IF NOT EXISTS "CandidatInteraction" (
  "id"         TEXT NOT NULL,
  "candidatId" TEXT NOT NULL,
  "type"       "InteractionType" NOT NULL,
  "date"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sujet"      TEXT,
  "contenu"    TEXT,
  "userId"     TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CandidatInteraction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CandidatInteraction_candidatId_idx" ON "CandidatInteraction"("candidatId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CandidatInteraction_candidatId_fkey') THEN
    ALTER TABLE "CandidatInteraction"
      ADD CONSTRAINT "CandidatInteraction_candidatId_fkey"
      FOREIGN KEY ("candidatId") REFERENCES "Candidat"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CandidatInteraction_userId_fkey') THEN
    ALTER TABLE "CandidatInteraction"
      ADD CONSTRAINT "CandidatInteraction_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
