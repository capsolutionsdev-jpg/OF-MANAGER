-- Module E-learning (LMS) : Cours → Modules → Leçons + progression + quiz

CREATE TABLE IF NOT EXISTS "Cours" (
  "id"          TEXT NOT NULL,
  "titre"       TEXT NOT NULL,
  "slug"        TEXT NOT NULL,
  "description" TEXT,
  "academy"     "Academy" NOT NULL,
  "formationId" TEXT,
  "niveau"      TEXT,
  "imageUrl"    TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "ordre"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Cours_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Cours_slug_key" ON "Cours"("slug");
CREATE INDEX IF NOT EXISTS "Cours_academy_idx" ON "Cours"("academy");
CREATE INDEX IF NOT EXISTS "Cours_formationId_idx" ON "Cours"("formationId");

CREATE TABLE IF NOT EXISTS "CoursModule" (
  "id"      TEXT NOT NULL,
  "coursId" TEXT NOT NULL,
  "titre"   TEXT NOT NULL,
  "ordre"   INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "CoursModule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CoursModule_coursId_idx" ON "CoursModule"("coursId");

CREATE TABLE IF NOT EXISTS "Lecon" (
  "id"             TEXT NOT NULL,
  "moduleId"       TEXT NOT NULL,
  "titre"          TEXT NOT NULL,
  "ordre"          INTEGER NOT NULL DEFAULT 0,
  "contenu"        TEXT,
  "videoUrl"       TEXT,
  "dureeMin"       INTEGER,
  "ressourcesJson" JSONB,
  "quizJson"       JSONB,
  "isPublished"    BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Lecon_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Lecon_moduleId_idx" ON "Lecon"("moduleId");

CREATE TABLE IF NOT EXISTS "ProgressionLecon" (
  "id"          TEXT NOT NULL,
  "apprenantId" TEXT NOT NULL,
  "leconId"     TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProgressionLecon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProgressionLecon_apprenantId_leconId_key" ON "ProgressionLecon"("apprenantId", "leconId");
CREATE INDEX IF NOT EXISTS "ProgressionLecon_apprenantId_idx" ON "ProgressionLecon"("apprenantId");

CREATE TABLE IF NOT EXISTS "QuizResultat" (
  "id"          TEXT NOT NULL,
  "apprenantId" TEXT NOT NULL,
  "leconId"     TEXT NOT NULL,
  "score"       INTEGER NOT NULL,
  "total"       INTEGER NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizResultat_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QuizResultat_apprenantId_leconId_key" ON "QuizResultat"("apprenantId", "leconId");
CREATE INDEX IF NOT EXISTS "QuizResultat_apprenantId_idx" ON "QuizResultat"("apprenantId");

-- Clés étrangères
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Cours_formationId_fkey') THEN
    ALTER TABLE "Cours" ADD CONSTRAINT "Cours_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CoursModule_coursId_fkey') THEN
    ALTER TABLE "CoursModule" ADD CONSTRAINT "CoursModule_coursId_fkey" FOREIGN KEY ("coursId") REFERENCES "Cours"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Lecon_moduleId_fkey') THEN
    ALTER TABLE "Lecon" ADD CONSTRAINT "Lecon_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CoursModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProgressionLecon_apprenantId_fkey') THEN
    ALTER TABLE "ProgressionLecon" ADD CONSTRAINT "ProgressionLecon_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "Apprenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProgressionLecon_leconId_fkey') THEN
    ALTER TABLE "ProgressionLecon" ADD CONSTRAINT "ProgressionLecon_leconId_fkey" FOREIGN KEY ("leconId") REFERENCES "Lecon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuizResultat_apprenantId_fkey') THEN
    ALTER TABLE "QuizResultat" ADD CONSTRAINT "QuizResultat_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "Apprenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuizResultat_leconId_fkey') THEN
    ALTER TABLE "QuizResultat" ADD CONSTRAINT "QuizResultat_leconId_fkey" FOREIGN KEY ("leconId") REFERENCES "Lecon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
