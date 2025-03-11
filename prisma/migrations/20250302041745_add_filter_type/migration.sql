-- CreateEnum
CREATE TYPE "FilterType" AS ENUM ('isEmpty', 'isNotEmpty', 'contains', 'greaterThan', 'lessThan');

-- CreateTable
CREATE TABLE "Filter" (
    "id" SERIAL NOT NULL,
    "columnId" TEXT NOT NULL,
    "type" "FilterType" NOT NULL,
    "value" TEXT,
    "viewId" INTEGER NOT NULL,

    CONSTRAINT "Filter_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Filter" ADD CONSTRAINT "Filter_viewId_fkey" FOREIGN KEY ("viewId") REFERENCES "View"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
