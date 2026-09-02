-- Migration ADDITIVE : visas manuels par élément de checklist d'audit.
-- npx prisma db execute --file scripts/migrate-audit-validations.sql --schema prisma/schema.prisma
ALTER TABLE "AuditControleDossier" ADD COLUMN IF NOT EXISTS "validations" JSONB;
