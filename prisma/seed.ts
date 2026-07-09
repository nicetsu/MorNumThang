import { PrismaClient } from "../app/generated/prisma/client";
import { pgAdapter } from "../lib/db";

const prisma = new PrismaClient({ adapter: pgAdapter() });

// ponytail: one seeded patient ("ม้า") mirroring the prototype. Grows as slices land.
async function main() {
  const count = await prisma.patient.count();
  if (count > 0) return;

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

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
