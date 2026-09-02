-- Chantier 02 : visas manuels des documents Qualiopi de la SESSION (rubrique 1 de l'audit).
ALTER TABLE "AuditControle" ADD COLUMN IF NOT EXISTS "sessionValidations" JSONB;
