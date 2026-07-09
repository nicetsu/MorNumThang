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
