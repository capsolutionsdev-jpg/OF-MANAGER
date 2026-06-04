-- Fiche prospect (lieu/pays naissance, diplôme, source d'acquisition, formulaire public signé)
-- + résultat de certification (BPF) + convocation d'examen

-- 1) Enum résultat de certification
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CertificationResultat') THEN
    CREATE TYPE "CertificationResultat" AS ENUM ('NON_EVALUE', 'CERTIFIE', 'AJOURNE', 'ABANDON');
  END IF;
END$$;

-- 2) Nouveau type de document
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'CONVOCATION_EXAMEN';

-- 3) Candidat : nouvelles colonnes
ALTER TABLE "Candidat" ADD COLUMN IF NOT EXISTS "lieuNaissance" TEXT;
ALTER TABLE "Candidat" ADD COLUMN IF NOT EXISTS "paysNaissance" TEXT;
ALTER TABLE "Candidat" ADD COLUMN IF NOT EXISTS "dernierDiplome" TEXT;
ALTER TABLE "Candidat" ADD COLUMN IF NOT EXISTS "sourceConnaissance" TEXT;
ALTER TABLE "Candidat" ADD COLUMN IF NOT EXISTS "prospectToken" TEXT;
ALTER TABLE "Candidat" ADD COLUMN IF NOT EXISTS "prospectFormSentAt" TIMESTAMP(3);
ALTER TABLE "Candidat" ADD COLUMN IF NOT EXISTS "prospectFormCompletedAt" TIMESTAMP(3);
ALTER TABLE "Candidat" ADD COLUMN IF NOT EXISTS "prospectSignatureUrl" TEXT;
ALTER TABLE "Candidat" ADD COLUMN IF NOT EXISTS "prospectSignatureIp" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Candidat_prospectToken_key" ON "Candidat"("prospectToken");

-- 4) Inscription : certification + convocation examen
ALTER TABLE "Inscription" ADD COLUMN IF NOT EXISTS "resultatCertification" "CertificationResultat" NOT NULL DEFAULT 'NON_EVALUE';
ALTER TABLE "Inscription" ADD COLUMN IF NOT EXISTS "certificationDate" TIMESTAMP(3);
ALTER TABLE "Inscription" ADD COLUMN IF NOT EXISTS "convocationExamenSentAt" TIMESTAMP(3);
