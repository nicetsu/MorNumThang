import { readFileSync } from "node:fs";
import { PrismaClient } from "../app/generated/prisma/client";
import { pgAdapter } from "../lib/db";

const prisma = new PrismaClient({ adapter: pgAdapter() });

// Health-rights reference data, converted from the spreadsheet by scripts/import_rights.py.
type RightsData = {
  rights: { id: string; name: string; eligibleUsers: string; facility: string; monthlyCost: string; coverageLevel: string }[];
  services: { id: string; name: string; category: string }[];
  agencies: { id: string; name: string; responsibility: string }[];
  facilities: { id: string; code: string; name: string; district: string; type: string; lat: number | null; lng: number | null }[];
  rules: { serviceName: string; right: string; facility: string; condition: string; category: string }[];
  docs: { service: string; docs: string }[];
};

async function seedPatient() {
  if ((await prisma.patient.count()) > 0) return;
  await prisma.patient.create({
    data: {
      name: "แม่สมทรง ใจดี",
      age: 74,
      coverage: "บัตรทอง",
      hospital: "รพ.เจริญกรุงประชารักษ์",
      job: "เกษียณแล้ว",
      likes: "ชอบละคร วาไรตี้ และมาสเตอร์เชฟ",
      caregiver: "เจี๊ยบ · ผู้ดูแลหลัก",
      diseases: "ความดันโลหิตสูง · เบาหวาน",
      allergies: { create: [{ name: "เพนิซิลลิน" }] },
    },
  });
}

// ponytail: guarded by a count check so re-seeding is idempotent; re-run
// scripts/import_rights.py then `db seed` to refresh when the sheet updates.
async function seedRights() {
  if ((await prisma.recommendationRule.count()) > 0) return;
  const d: RightsData = JSON.parse(readFileSync(new URL("./rights-data.json", import.meta.url), "utf-8"));
  await prisma.healthRight.createMany({ data: d.rights });
  await prisma.service.createMany({ data: d.services });
  await prisma.agency.createMany({ data: d.agencies });
  await prisma.facility.createMany({ data: d.facilities });
  await prisma.recommendationRule.createMany({ data: d.rules });
  await prisma.requiredDoc.createMany({ data: d.docs });
}

// ponytail: one seeded patient ("ม้า") + the health-rights reference tables.
async function main() {
  await seedPatient();
  await seedRights();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
