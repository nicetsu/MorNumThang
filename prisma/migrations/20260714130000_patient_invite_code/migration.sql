-- AddColumn (nullable first so existing rows can be backfilled)
ALTER TABLE "Patient" ADD COLUMN "inviteCode" TEXT;

-- Backfill existing patients with a random code
UPDATE "Patient" SET "inviteCode" = gen_random_uuid()::text WHERE "inviteCode" IS NULL;

-- Enforce NOT NULL + uniqueness
ALTER TABLE "Patient" ALTER COLUMN "inviteCode" SET NOT NULL;
CREATE UNIQUE INDEX "Patient_inviteCode_key" ON "Patient"("inviteCode");
