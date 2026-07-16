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
  // The demo ผู้ดูแล — everyone entering the code "demo" logs in as this user.
  const demo = await prisma.user.upsert({ where: { lineId: "demo" }, update: {}, create: { lineId: "demo" } });
  const owns = { connect: { id: demo.id } };
  // Primary ผู้รับการดูแล (full profile + allergy) — only when the DB is empty.
  if ((await prisma.patient.count()) === 0) {
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
        caregivers: owns,
      },
    });
  }
  // ponytail: 4 more mock ผู้รับการดูแล, topped up by name so re-seeding an existing DB is idempotent.
  const mocks = [
    { name: "พ่อบุญมี รักษ์ดี", age: 78, coverage: "ข้าราชการ", hospital: "รพ.ศิริราช", job: "ครูเกษียณ", caregiver: "หน่อย · ลูกสาว", diseases: "หัวใจ" },
    { name: "แม่ประนอม สุขใจ", age: 69, coverage: "บัตรทอง", hospital: "รพ.ตากสิน", job: "แม่ค้า", caregiver: "ต้น · ลูกชาย", diseases: "เบาหวาน · ไต" },
    { name: "แม่ลำใย ทองมา", age: 81, coverage: "ประกันสังคม", hospital: "รพ.กลาง", job: "เกษียณแล้ว", caregiver: "แนน · หลานสาว", diseases: "ข้อเข่าเสื่อม" },
    { name: "พ่อสมชาย ดีงาม", age: 72, coverage: "บัตรทอง", hospital: "รพ.เลิดสิน", job: "อดีตคนขับรถ", caregiver: "โบว์ · ลูกสาว", diseases: "ความดันโลหิตสูง" },
  ];
  for (const m of mocks) {
    if (!(await prisma.patient.findFirst({ where: { name: m.name } }))) {
      await prisma.patient.create({ data: { ...m, caregivers: owns } });
    }
  }
}

// Re-run scripts/import_rights.py then `db seed` to refresh when the sheet updates.
async function seedRights() {
  const d: RightsData = JSON.parse(readFileSync(new URL("./rights-data.json", import.meta.url), "utf-8"));
  // String-id tables (R001/S001/A001/F001…): skipDuplicates adds only new rows, so a
  // sheet update (e.g. the 30 new facilities) flows in on re-seed without wiping the rest.
  await prisma.healthRight.createMany({ data: d.rights, skipDuplicates: true });
  await prisma.service.createMany({ data: d.services, skipDuplicates: true });
  await prisma.agency.createMany({ data: d.agencies, skipDuplicates: true });
  await prisma.facility.createMany({ data: d.facilities, skipDuplicates: true });
  // Autoincrement PKs — skipDuplicates can't dedupe by content, so guard against re-insert.
  if ((await prisma.recommendationRule.count()) === 0) await prisma.recommendationRule.createMany({ data: d.rules });
  if ((await prisma.requiredDoc.count()) === 0) await prisma.requiredDoc.createMany({ data: d.docs });
}

// ponytail: one seeded patient ("ผู้รับการดูแล") + the health-rights reference tables.
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
