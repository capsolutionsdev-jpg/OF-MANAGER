-- E-learning V2 : images de leçon + attribution cours↔apprenant

ALTER TABLE "Lecon" ADD COLUMN IF NOT EXISTS "imagesJson" JSONB;

CREATE TABLE IF NOT EXISTS "CoursApprenant" (
  "id"          TEXT NOT NULL,
  "coursId"     TEXT NOT NULL,
  "apprenantId" TEXT NOT NULL,
  "assignedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoursApprenant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CoursApprenant_coursId_apprenantId_key" ON "CoursApprenant"("coursId", "apprenantId");
CREATE INDEX IF NOT EXISTS "CoursApprenant_apprenantId_idx" ON "CoursApprenant"("apprenantId");
CREATE INDEX IF NOT EXISTS "CoursApprenant_coursId_idx" ON "CoursApprenant"("coursId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CoursApprenant_coursId_fkey') THEN
    ALTER TABLE "CoursApprenant" ADD CONSTRAINT "CoursApprenant_coursId_fkey" FOREIGN KEY ("coursId") REFERENCES "Cours"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CoursApprenant_apprenantId_fkey') THEN
    ALTER TABLE "CoursApprenant" ADD CONSTRAINT "CoursApprenant_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "Apprenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
