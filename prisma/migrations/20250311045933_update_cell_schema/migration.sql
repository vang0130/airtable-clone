/*
  Warnings:

  - You are about to drop the `Cell` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `values` to the `Row` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Cell" DROP CONSTRAINT "Cell_headerId_fkey";

-- DropForeignKey
ALTER TABLE "Cell" DROP CONSTRAINT "Cell_rowId_fkey";

-- AlterTable
ALTER TABLE "Row" ADD COLUMN     "values" JSONB NOT NULL;

-- DropTable
DROP TABLE "Cell";
