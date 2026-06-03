-- CreateEnum
CREATE TYPE "DemiJournee" AS ENUM ('MATIN', 'APRES_MIDI');

-- AlterTable Session : compte-rendu pédagogique formateur
ALTER TABLE "Session" ADD COLUMN     "crFormateurToken" TEXT,
ADD COLUMN     "crFormateurSentAt" TIMESTAMP(3),
ADD COLUMN     "crFormateurJson" JSONB,
ADD COLUMN     "crFormateurCompletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Session_crFormateurToken_key" ON "Session"("crFormateurToken");

-- CreateTable
CREATE TABLE "EmargementSignature" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "demi" "DemiJournee" NOT NULL,
    "role" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "candidatId" TEXT,
    "token" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signatureIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmargementSignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmargementSignature_token_key" ON "EmargementSignature"("token");

-- CreateIndex
CREATE INDEX "EmargementSignature_sessionId_idx" ON "EmargementSignature"("sessionId");

-- AddForeignKey
ALTER TABLE "EmargementSignature" ADD CONSTRAINT "EmargementSignature_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AutomationSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "convocationActive" BOOLEAN NOT NULL DEFAULT true,
    "convocationJMoins" INTEGER NOT NULL DEFAULT 7,
    "attestationEntreeActive" BOOLEAN NOT NULL DEFAULT true,
    "satisfactionActive" BOOLEAN NOT NULL DEFAULT true,
    "docsFinActive" BOOLEAN NOT NULL DEFAULT true,
    "compteRenduActive" BOOLEAN NOT NULL DEFAULT true,
    "emargementActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationSettings_pkey" PRIMARY KEY ("id")
);
