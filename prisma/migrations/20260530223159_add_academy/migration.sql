-- CreateEnum
CREATE TYPE "Academy" AS ENUM ('DIGITAL', 'SAFETY', 'TRANSPORT', 'LANGUE');

-- AlterTable
ALTER TABLE "Formation" ADD COLUMN     "academy" "Academy";
