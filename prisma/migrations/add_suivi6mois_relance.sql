-- AddColumn : traçabilité des relances de l'enquête de suivi à 6 mois (Qualiopi ind. 11)
-- Idempotent (IF NOT EXISTS) : rejouable sans risque.
ALTER TABLE "Inscription" ADD COLUMN IF NOT EXISTS "suivi6moisRelanceAt" TIMESTAMP(3);
ALTER TABLE "Inscription" ADD COLUMN IF NOT EXISTS "suivi6moisRelanceCount" INTEGER NOT NULL DEFAULT 0;

-- suivi6moisRelanceAt    : date de la dernière relance manuelle envoyée
-- suivi6moisRelanceCount : nombre total de relances envoyées (affiché dans le suivi)
