-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_lineId_key" ON "User"("lineId");

-- CreateTable (implicit m-n join: A = Patient, B = User)
CREATE TABLE "_PatientToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PatientToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PatientToUser_B_index" ON "_PatientToUser"("B");

-- Backfill: one User per distinct owner, then link each Patient to its owner's User.
INSERT INTO "User" ("id", "lineId")
SELECT DISTINCT "owner", "owner" FROM "Patient";

INSERT INTO "_PatientToUser" ("A", "B")
SELECT "id", "owner" FROM "Patient";

-- AddForeignKey
ALTER TABLE "_PatientToUser" ADD CONSTRAINT "_PatientToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_PatientToUser" ADD CONSTRAINT "_PatientToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropColumn (drops Patient_owner_idx with it)
ALTER TABLE "Patient" DROP COLUMN "owner";
