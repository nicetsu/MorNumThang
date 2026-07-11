-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "owner" TEXT NOT NULL DEFAULT 'demo';

-- CreateIndex
CREATE INDEX "Patient_owner_idx" ON "Patient"("owner");
