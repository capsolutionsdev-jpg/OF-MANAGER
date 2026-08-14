-- AddColumn cnapsNumero et cnapsValiditeDate au model Candidat
ALTER TABLE "Candidat" ADD COLUMN "cnapsNumero" TEXT;
ALTER TABLE "Candidat" ADD COLUMN "cnapsValiditeDate" TIMESTAMP;

-- Commentaires pour clarté
-- cnapsNumero: numéro de l'autorisation préalable CNAPS (format : [AAAA]-[XXXXX])
-- cnapsValiditeDate: date d'expiration de l'autorisation CNAPS (valable 6 mois)
