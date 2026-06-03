-- AlterTable
ALTER TABLE "Inscription" ADD COLUMN     "accessToken" TEXT,
ADD COLUMN     "formCompletedAt" TIMESTAMP(3),
ADD COLUMN     "signedAt" TIMESTAMP(3),
ADD COLUMN     "signatureIp" TEXT,
ADD COLUMN     "docsCopieSentAt" TIMESTAMP(3),
ADD COLUMN     "convocationSentAt" TIMESTAMP(3),
ADD COLUMN     "attestationEntreeSentAt" TIMESTAMP(3),
ADD COLUMN     "satisfactionToken" TEXT,
ADD COLUMN     "satisfactionSentAt" TIMESTAMP(3),
ADD COLUMN     "satisfactionJson" JSONB,
ADD COLUMN     "satisfactionCompletedAt" TIMESTAMP(3),
ADD COLUMN     "docsFinSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Inscription_accessToken_key" ON "Inscription"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "Inscription_satisfactionToken_key" ON "Inscription"("satisfactionToken");
