-- CreateEnum
CREATE TYPE "HeaderType" AS ENUM ('TEXT', 'NUMBER');

-- AlterTable
ALTER TABLE "Header" ADD COLUMN     "type" "HeaderType" NOT NULL DEFAULT 'TEXT';
