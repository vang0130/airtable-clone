-- CreateTable
CREATE TABLE "Header" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "tableId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Header_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Header" ADD CONSTRAINT "Header_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
