/*
  Warnings:

  - You are about to drop the `Column` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Value` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `values` to the `Row` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sheetId` to the `Table` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Column" DROP CONSTRAINT "Column_tableId_fkey";

-- DropForeignKey
ALTER TABLE "Value" DROP CONSTRAINT "Value_columnId_fkey";

-- DropForeignKey
ALTER TABLE "Value" DROP CONSTRAINT "Value_rowId_fkey";

-- AlterTable
ALTER TABLE "Row" ADD COLUMN     "values" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "Table" ADD COLUMN     "header" TEXT[],
ADD COLUMN     "sheetId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "Column";

-- DropTable
DROP TABLE "Value";

-- CreateTable
CREATE TABLE "Sheet" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Sheet_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Sheet" ADD CONSTRAINT "Sheet_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "Sheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
