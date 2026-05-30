-- AlterTable
ALTER TABLE "Formateur" ADD COLUMN     "academies" "Academy"[];

-- CreateTable
CREATE TABLE "_FormateurToFormation" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FormateurToFormation_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_FormateurToFormation_B_index" ON "_FormateurToFormation"("B");

-- AddForeignKey
ALTER TABLE "_FormateurToFormation" ADD CONSTRAINT "_FormateurToFormation_A_fkey" FOREIGN KEY ("A") REFERENCES "Formateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FormateurToFormation" ADD CONSTRAINT "_FormateurToFormation_B_fkey" FOREIGN KEY ("B") REFERENCES "Formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
