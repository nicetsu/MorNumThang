// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { bangkokDateKey } from "@/lib/care-checks";
import { db } from "@/lib/db";
import { getActivePatient } from "@/lib/patient";
import { markMedTaken } from "./actions";
import { BackLink } from "@/components/back-link";

// Each meal-timing is its own slot, so "ก่อนอาหาร" and "หลังอาหาร" never merge.
const WHEN_ORDER = [
  "ก่อนอาหารเช้า",
  "หลังอาหารเช้า",
  "ก่อนอาหารกลางวัน",
  "หลังอาหารกลางวัน",
  "ก่อนอาหารเย็น",
  "หลังอาหารเย็น",
  "ก่อนนอน",
];

// Short time-of-day label shown big; the exact meal-timing is the small hint.
function timeOf(w: string): string {
  if (w.startsWith("เวลา ")) return "ตั้งเวลา";
  if (w.includes("เช้า")) return "เช้า";
  if (w.includes("กลางวัน")) return "กลางวัน";
  if (w.includes("เย็น")) return "เย็น";
  if (w.includes("นอน")) return "ก่อนนอน";
  return "อื่น ๆ";
}

export default async function MedSchedule() {
  const patient = await getActivePatient();
  if (!patient) {
    return <p className="py-8 text-muted-foreground">ยังไม่มีข้อมูลผู้รับการดูแลค่ะ</p>;
  }
  const today = bangkokDateKey(new Date());
  const [meds, takenChecks] = await Promise.all([
    db.medication.findMany({
      where: { patientId: patient.id },
      orderBy: { name: "asc" },
    }),
    db.dailyCheck.findMany({
      where: { patientId: patient.id, date: today, itemKey: { startsWith: "med:" } },
      select: { itemKey: true },
    }),
  ]);
  const takenToday = new Set(takenChecks.map((c) => c.itemKey));
  const dose = (m: (typeof meds)[number]) => (m.dose ? `${m.dose} เม็ด` : "");

  // Build slots for standard timings
  const standardSlots = WHEN_ORDER.map((when) => ({ when, meds: meds.filter((m) => m.whenTime === when) })).filter(
    (s) => s.meds.length > 0,
  );

  // Group other medications (custom times, custom text, or no timing)
  const otherMeds = meds.filter((m) => !m.whenTime || !WHEN_ORDER.includes(m.whenTime));
  const otherGroups: { when: string; meds: typeof meds }[] = [];
  const noTimeMeds: typeof meds = [];

  for (const m of otherMeds) {
    if (!m.whenTime) {
      noTimeMeds.push(m);
    } else {
      let group = otherGroups.find((g) => g.when === m.whenTime);
      if (!group) {
        group = { when: m.whenTime, meds: [] };
        otherGroups.push(group);
      }
      group.meds.push(m);
    }
  }

  // Sort otherGroups (e.g. "เวลา 08:00" before "เวลา 20:00")
  otherGroups.sort((a, b) => a.when.localeCompare(b.when));

  const slots = [...standardSlots, ...otherGroups];
  if (noTimeMeds.length > 0) {
    slots.push({ when: "ตามแพทย์สั่ง", meds: noTimeMeds });
  }

  return (
    <div className="space-y-4">
      <BackLink fallback="/meds">กลับ</BackLink>
      <div>
        <p className="eyebrow">ตารางยาของผู้รับการดูแล</p>
        <h2 className="screen-title">ยาของผู้รับการดูแล</h2>
        <p className="lead">แบ่งตามช่วงเวลาให้เห็นชัดว่ามื้อไหนต้องกินอะไร</p>
      </div>

      <div className="section-heading">
        <h3>ตารางวันนี้</h3>
        <Link href="/meds/add" className="inline-flex items-center gap-1"><Plus aria-hidden className="size-[1em]" />เพิ่มยา</Link>
      </div>

      {slots.length === 0 ? (
        <p className="rounded-[18px] border border-dashed border-line p-6 text-center text-muted-foreground">
          ยังไม่มีรายการยา
        </p>
      ) : (
        slots.map((s) => (
          <article key={s.when} className="dose-slot">
            <div className="dose-time">
              <span>{timeOf(s.when)}</span>
              <small>{s.when}</small>
            </div>
            <ul className="dose-list">
              {s.meds.map((m) => (
                <li key={m.id}>
                  <strong>{m.name}</strong>
                  <small>{dose(m)}</small>
                </li>
              ))}
            </ul>
          </article>
        ))
      )}

      {meds.length > 0 && (
        <>
          <div className="section-heading">
            <h3>ยาที่กำลังติดตาม</h3>
          </div>
          <div className="space-y-2">
            {meds.map((m) => (
              <article key={m.id} className="list-card">
                <span className="pill-icon">ยา</span>
                <div>
                  <strong>{m.name}{m.dose ? ` · ${m.dose} เม็ด` : ""}</strong>
                  <small>
                    {[m.whenTime, m.remaining != null ? `เหลือ ${m.remaining} เม็ด` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </div>
                {takenToday.has(`med:${m.id}`) ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-teal">กินแล้ว <Check aria-hidden className="size-[1em] shrink-0" /></span>
                ) : (
                  <form action={markMedTaken}>
                    <input type="hidden" name="medId" value={m.id} />
                    <SubmitButton
                      className="shrink-0 rounded-full bg-teal-soft px-3 py-1.5 text-sm font-bold text-teal"
                      pendingText="…"
                    >
                      กินแล้ว
                    </SubmitButton>
                  </form>
                )}
              </article>
            ))}
          </div>
        </>
      )}

      <p className="safety-line mt-2">
        ตารางนี้ช่วยจำเท่านั้น หากไม่แน่ใจให้โทรถามแพทย์หรือเภสัชกรค่ะ
      </p>
    </div>
  );
}
