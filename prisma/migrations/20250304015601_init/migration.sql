/*
  Warnings:

  - You are about to drop the column `values` on the `Row` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Row" DROP COLUMN "values";

-- CreateTable
CREATE TABLE "Cell" (
    "id" SERIAL NOT NULL,
    "rowId" INTEGER NOT NULL,
    "headerId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cell_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cell_headerId_idx" ON "Cell"("headerId");

-- CreateIndex
CREATE UNIQUE INDEX "Cell_rowId_headerId_key" ON "Cell"("rowId", "headerId");

-- AddForeignKey
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "Row"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_headerId_fkey" FOREIGN KEY ("headerId") REFERENCES "Header"("id") ON DELETE CASCADE ON UPDATE CASCADE;
