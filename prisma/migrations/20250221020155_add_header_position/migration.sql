/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Header` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tableId,position]` on the table `Header` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tableId,position]` on the table `Row` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `position` to the `Header` table without a default value. This is not possible if the table is not empty.
  - Added the required column `position` to the `Row` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Header" DROP COLUMN "createdAt",
ADD COLUMN     "position" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Row" ADD COLUMN     "position" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Header_tableId_position_key" ON "Header"("tableId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Row_tableId_position_key" ON "Row"("tableId", "position");
