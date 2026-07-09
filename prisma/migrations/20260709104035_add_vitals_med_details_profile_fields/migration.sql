-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "place" TEXT;

-- AlterTable
ALTER TABLE "Medication" ADD COLUMN     "dose" DOUBLE PRECISION,
ADD COLUMN     "perDay" INTEGER,
ADD COLUMN     "remaining" INTEGER,
ADD COLUMN     "whenTime" TEXT;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "coverage" TEXT,
ADD COLUMN     "hospital" TEXT,
ADD COLUMN     "job" TEXT,
ADD COLUMN     "likes" TEXT;

-- AlterTable
ALTER TABLE "WeightLog" ADD COLUMN     "diastolic" INTEGER,
ADD COLUMN     "pulse" INTEGER,
ADD COLUMN     "systolic" INTEGER;
