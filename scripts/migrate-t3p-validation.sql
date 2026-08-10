-- Migration ADDITIVE : validation manuelle des étapes T3P par les collaborateurs.
-- Appliquée via : npx prisma db execute --file scripts/migrate-t3p-validation.sql --schema prisma/schema.prisma
-- Idempotent (ADD COLUMN IF NOT EXISTS).
ALTER TABLE "ParcoursT3P" ADD COLUMN IF NOT EXISTS "etapesValidation" JSONB;
