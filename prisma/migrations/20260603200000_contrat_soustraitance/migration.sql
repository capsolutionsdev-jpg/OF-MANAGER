-- AlterTable Formateur : données contrat de sous-traitance
ALTER TABLE "Formateur" ADD COLUMN     "adresse" TEXT,
ADD COLUMN     "siret" TEXT,
ADD COLUMN     "tarifJournalier" DECIMAL(10,2);

-- AlterTable Session : tarif formateur + circuit signature contrat
ALTER TABLE "Session" ADD COLUMN     "tarifFormateurJour" DECIMAL(10,2),
ADD COLUMN     "contratFormateurToken" TEXT,
ADD COLUMN     "contratFormateurSentAt" TIMESTAMP(3),
ADD COLUMN     "contratFormateurSignedAt" TIMESTAMP(3),
ADD COLUMN     "contratFormateurSignatureUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Session_contratFormateurToken_key" ON "Session"("contratFormateurToken");
