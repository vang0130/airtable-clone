/*
  Warnings:

  - Added the required column `headerPosition` to the `Cell` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rowPosition` to the `Cell` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tableId` to the `Cell` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Cell" ADD COLUMN     "headerPosition" INTEGER NOT NULL,
ADD COLUMN     "rowPosition" INTEGER NOT NULL,
ADD COLUMN     "tableId" INTEGER NOT NULL;
