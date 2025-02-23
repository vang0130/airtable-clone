/*
  Warnings:

  - You are about to drop the column `position` on the `Header` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `Row` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tableId,headerPosition]` on the table `Header` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tableId,rowPosition]` on the table `Row` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `headerPosition` to the `Header` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rowPosition` to the `Row` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Header_tableId_position_key";

-- DropIndex
DROP INDEX "Row_tableId_position_key";

-- AlterTable
ALTER TABLE "Header" DROP COLUMN "position",
ADD COLUMN     "headerPosition" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Row" DROP COLUMN "position",
ADD COLUMN     "rowPosition" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Header_tableId_headerPosition_key" ON "Header"("tableId", "headerPosition");

-- CreateIndex
CREATE UNIQUE INDEX "Row_tableId_rowPosition_key" ON "Row"("tableId", "rowPosition");
