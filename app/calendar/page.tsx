// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { getActivePatient } from "@/lib/patient";
import { CalendarView } from "./calendar-view";

// Thai-local (UTC+7) date — the server runs in UTC on Vercel, so format with the
// Bangkok timezone or an evening appointment lands on the wrong calendar day.
const TZ = "Asia/Bangkok";
const dateKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // YYYY-MM-DD
const timeStr = (d: Date) =>
  new Intl.DateTimeFormat("th-TH", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);

// Starter care tasks (mockup defaults) so a fresh patient sees a useful list.
const DEFAULT_TASKS: { category: string; title: string }[] = [
  { category: "สุขภาพ", title: "วัดความดัน" },
  { category: "สุขภาพ", title: "ตรวจน้ำตาล" },
  { category: "สุขภาพ", title: "วัดไข้" },
  { category: "ฟื้นฟู", title: "กายภาพบำบัด" },
  { category: "ฟื้นฟู", title: "เดินออกกำลังกาย" },
  { category: "ฟื้นฟู", title: "ยืดเหยียด" },
];

export default async function CalendarPage() {
  const patient = await getActivePatient();
  if (!patient) {
    return <p className="py-8 text-muted-foreground">ยังไม่มีข้อมูลผู้รับการดูแลค่ะ</p>;
  }

  // Seed defaults once (idempotent — only when the patient has no care tasks yet).
  if ((await db.careTask.count({ where: { patientId: patient.id } })) === 0) {
    await db.careTask.createMany({
      data: DEFAULT_TASKS.map((t, i) => ({ ...t, patientId: patient.id, sortOrder: i })),
    });
  }

  const [meds, careTasks, checks, appts] = await Promise.all([
    db.medication.findMany({ where: { patientId: patient.id }, select: { id: true, name: true, dose: true, whenTime: true } }),
    db.careTask.findMany({ where: { patientId: patient.id }, orderBy: { sortOrder: "asc" }, select: { id: true, category: true, title: true, time: true } }),
    db.dailyCheck.findMany({ where: { patientId: patient.id }, select: { itemKey: true, date: true } }),
    db.appointment.findMany({ where: { patientId: patient.id }, orderBy: { at: "asc" }, select: { id: true, at: true, note: true, place: true, done: true } }),
  ]);

  const medItems = meds.map((m) => ({
    key: `med:${m.id}`,
    title: `${m.name}${m.dose ? ` · ${m.dose} เม็ด` : ""}`,
    meta: m.whenTime ?? "",
  }));
  const taskItems = careTasks.map((t) => ({
    id: t.id,
    key: `task:${t.id}`,
    category: t.category,
    title: t.title,
    meta: t.time ?? "",
  }));

  // checksByDate: date -> itemKeys marked done that day.
  const checksByDate: Record<string, string[]> = {};
  for (const c of checks) (checksByDate[c.date] ??= []).push(c.itemKey);

  const apptItems = appts.map((a) => ({
    id: a.id,
    dateKey: dateKey(a.at),
    time: timeStr(a.at),
    note: a.note ?? "นัดหมอ",
    place: a.place,
    done: a.done,
  }));

  return (
    <div className="space-y-4">
      <Link href="/" className="back-link">← สมุดของผู้รับการดูแล</Link>
      <CalendarView
        todayISO={dateKey(new Date())}
        medItems={medItems}
        taskItems={taskItems}
        checksByDate={checksByDate}
        appts={apptItems}
      />
    </div>
  );
}
