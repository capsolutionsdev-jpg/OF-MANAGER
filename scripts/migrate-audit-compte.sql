-- Chantier 02 : suivi de l'envoi des identifiants du compte candidat depuis l'audit.
ALTER TABLE "AuditControleDossier" ADD COLUMN IF NOT EXISTS "compteSentAt" TIMESTAMP(3);
ALTER TABLE "AuditControleDossier" ADD COLUMN IF NOT EXISTS "compteSentCount" INTEGER NOT NULL DEFAULT 0;
