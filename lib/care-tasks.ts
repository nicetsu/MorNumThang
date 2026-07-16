import { db } from "@/lib/db";

// Starter care tasks (mockup defaults) so a fresh patient sees a useful list.
export const DEFAULT_CARE_TASKS: { category: string; title: string }[] = [
  { category: "สุขภาพ", title: "วัดน้ำหนัก" },
  { category: "สุขภาพ", title: "วัดความดัน" },
  { category: "สุขภาพ", title: "วัดชีพจร" },
  { category: "ฟื้นฟู", title: "กายภาพบำบัด" },
  { category: "ฟื้นฟู", title: "เดินออกกำลังกาย" },
  { category: "ฟื้นฟู", title: "ยืดเหยียด" },
];

export async function ensureDefaultCareTasks(patientId: string) {
  if ((await db.careTask.count({ where: { patientId } })) === 0) {
    await db.careTask.createMany({
      data: DEFAULT_CARE_TASKS.map((t, i) => ({ ...t, patientId, sortOrder: i })),
    });
  }
}
