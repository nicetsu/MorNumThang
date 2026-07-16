-- AlterTable
ALTER TABLE "Patient" ADD COLUMN "selfOfUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Patient_selfOfUserId_key" ON "Patient"("selfOfUserId");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_selfOfUserId_fkey" FOREIGN KEY ("selfOfUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
