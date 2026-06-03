-- AlterTable
ALTER TABLE "Candidat" ADD COLUMN     "formationSouhaiteeId" TEXT;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Candidat" ADD CONSTRAINT "Candidat_formationSouhaiteeId_fkey" FOREIGN KEY ("formationSouhaiteeId") REFERENCES "Formation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
