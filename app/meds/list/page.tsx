// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";

// The four time-of-day slots (prototype screen 17), always shown.
const SLOTS: { label: string; hint: string; match: (w: string | null) => boolean }[] = [
  { label: "เช้า", hint: "หลังอาหารเช้า", match: (w) => !!w?.includes("เช้า") },
  { label: "กลางวัน", hint: "หลังอาหารกลางวัน", match: (w) => !!w?.includes("กลางวัน") },
  { label: "เย็น", hint: "หลังอาหารเย็น", match: (w) => !!w?.includes("เย็น") },
  { label: "ก่อนนอน", hint: "ก่อนเข้านอน", match: (w) => !!w?.includes("ก่อนนอน") },
];

export default async function MedSchedule() {
  const patient = await db.patient.findFirst();
  if (!patient) {
    return <p className="py-8 text-muted-foreground">ยังไม่มีข้อมูลม้าค่ะ</p>;
  }
  const meds = await db.medication.findMany({
    where: { patientId: patient.id },
    orderBy: { name: "asc" },
  });
  const other = meds.filter((m) => !SLOTS.some((s) => s.match(m.whenTime)));
  const dose = (m: (typeof meds)[number]) => (m.dose ? `${m.dose} เม็ด` : "");

  return (
    <div className="space-y-4">
      <Link href="/meds" className="back-link">← ยา &amp; นัด</Link>
      <div>
        <p className="eyebrow">ตารางยาของม้า</p>
        <h2 className="screen-title">ยาของม้า</h2>
        <p className="lead">แบ่งตามช่วงเวลาให้เห็นชัดว่ามื้อไหนต้องกินอะไร</p>
      </div>

      <div className="section-heading">
        <h3>ตารางวันนี้</h3>
        <Link href="/meds/add">+ เพิ่มยา</Link>
      </div>

      {SLOTS.map((s) => {
        const inSlot = meds.filter((m) => s.match(m.whenTime));
        return (
          <article key={s.label} className="dose-slot">
            <div className="dose-time">
              <span>{s.label}</span>
              <small>{s.hint}</small>
            </div>
            {inSlot.length === 0 ? (
              <p className="dose-empty">— ไม่มียาช่วงนี้ —</p>
            ) : (
              <ul className="dose-list">
                {inSlot.map((m) => (
                  <li key={m.id}>
                    <strong>{m.name}</strong>
                    <small>{dose(m)}</small>
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}

      {other.length > 0 && (
        <article className="dose-slot">
          <div className="dose-time">
            <span>อื่น ๆ</span>
            <small>ตามแพทย์สั่ง</small>
          </div>
          <ul className="dose-list">
            {other.map((m) => (
              <li key={m.id}>
                <strong>{m.name}</strong>
                <small>{dose(m)}</small>
              </li>
            ))}
          </ul>
        </article>
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
