-- Inscription : statut « Suspendue » + mode et état de paiement

-- 1) Nouveau statut d'inscription
ALTER TYPE "InscriptionStatut" ADD VALUE IF NOT EXISTS 'SUSPENDUE';

-- 2) Enum état de paiement
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaiementStatut') THEN
    CREATE TYPE "PaiementStatut" AS ENUM ('EN_ATTENTE', 'ACOMPTE', 'PAYE', 'REMBOURSE', 'ANNULE');
  END IF;
END$$;

-- 3) Colonnes paiement sur l'inscription
ALTER TABLE "Inscription" ADD COLUMN IF NOT EXISTS "modePaiement" TEXT;
ALTER TABLE "Inscription" ADD COLUMN IF NOT EXISTS "paiementStatut" "PaiementStatut" NOT NULL DEFAULT 'EN_ATTENTE';
