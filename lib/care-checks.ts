import { db } from "@/lib/db";
import { ensureDefaultCareTasks } from "@/lib/care-tasks";

const TZ = "Asia/Bangkok";

const VITAL_TASK_TITLES = {
  weight: "วัดน้ำหนัก",
  bp: "วัดความดัน",
  pulse: "วัดชีพจร",
} as const;

export function bangkokDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

/** Mark calendar items ("med:<id>" | "task:<id>") done on `date`. */
export async function autoCheckCalendarItems(
  patientId: string,
  date: string,
  itemKeys: string[],
) {
  if (!itemKeys.length) return;
  await db.$transaction(
    itemKeys.map((itemKey) =>
      db.dailyCheck.upsert({
        where: { patientId_itemKey_date: { patientId, itemKey, date } },
        create: { patientId, itemKey, date },
        update: {},
      }),
    ),
  );
}

/** Mark a medication taken on `date` (calendar "med:<id>" row). */
export async function autoCheckMed(patientId: string, medId: string, date: string) {
  const med = await db.medication.findFirst({ where: { id: medId, patientId }, select: { id: true } });
  if (!med) return;
  await autoCheckCalendarItems(patientId, date, [`med:${medId}`]);
}

/** Mark matching สุขภาพ care tasks done on `date` after vitals are logged. */
export async function autoCheckVitalCareTasks(
  patientId: string,
  date: string,
  vitals: { weight?: boolean; bp?: boolean; pulse?: boolean },
) {
  const titles: string[] = [];
  if (vitals.weight) titles.push(VITAL_TASK_TITLES.weight);
  if (vitals.bp) titles.push(VITAL_TASK_TITLES.bp);
  if (vitals.pulse) titles.push(VITAL_TASK_TITLES.pulse);
  if (!titles.length) return;

  await ensureDefaultCareTasks(patientId);

  const tasks = await db.careTask.findMany({
    where: { patientId, category: "สุขภาพ", title: { in: titles } },
    select: { id: true },
  });
  if (!tasks.length) return;

  await autoCheckCalendarItems(
    patientId,
    date,
    tasks.map((t) => `task:${t.id}`),
  );
}
