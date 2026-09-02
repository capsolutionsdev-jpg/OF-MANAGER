-- Chantier 02 : pièces Qualiopi au niveau de l'organisme (rubrique « Documents de l'organisme »).
ALTER TABLE "Organisme" ADD COLUMN IF NOT EXISTS "piecesQualiopi" JSONB;
