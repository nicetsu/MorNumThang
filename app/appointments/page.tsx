// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { addAppointment, completeAppointment, addVisitNote } from "./actions";
import { ShareButton } from "@/components/share-button";

function fmt(at: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(at);
}

export default async function Appointments() {
  const patient = await db.patient.findFirst();
  if (!patient) {
    return <p className="py-8 text-muted-foreground">ยังไม่มีข้อมูลม้าค่ะ</p>;
  }

  const [appts, visits] = await Promise.all([
    db.appointment.findMany({ where: { patientId: patient.id }, orderBy: { at: "asc" } }),
    db.visitNote.findMany({ where: { patientId: patient.id }, orderBy: { at: "desc" } }),
  ]);

  const inputCls = "w-full rounded-xl border border-line bg-ivory px-4 py-3";

  return (
    <div className="space-y-6 py-2">
      <Link href="/meds" className="inline-block font-bold text-teal">
        ← ยา & นัด
      </Link>
      <div>
        <p className="text-sm text-muted-foreground">นัดหมายของม้า</p>
        <h2 className="text-2xl font-extrabold text-teal">นัดหมอ</h2>
      </div>

      {/* Create appointment */}
      <form action={addAppointment} className="space-y-4 rounded-2xl border border-line bg-card p-5">
        <h3 className="text-lg font-bold">จดนัดใหม่</h3>
        <label className="block">
          <span className="mb-1 block font-bold">เรื่องที่นัด</span>
          <input name="note" required placeholder="เช่น ติดตามอายุรกรรมหัวใจ" className={inputCls} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block font-bold">วันที่</span>
            <input name="date" type="date" required className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block font-bold">เวลา</span>
            <input name="time" type="time" className={inputCls} />
          </label>
        </div>
        <button type="submit" className="w-full rounded-xl bg-teal py-3 text-lg font-bold text-white">
          + เพิ่มนัด
        </button>
      </form>

      {/* Appointment list */}
      <section>
        <h3 className="mb-3 text-xl font-bold">นัดทั้งหมด</h3>
        {appts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted-foreground">
            ยังไม่มีนัดหมาย
          </p>
        ) : (
          <div className="space-y-2">
            {appts.map((a) => (
              <article key={a.id} className="rounded-2xl border border-line bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="text-lg">{a.note ?? "นัดหมอ"}</strong>
                    <p className="text-sm text-muted-foreground">{fmt(a.at)}</p>
                  </div>
                  {a.done ? (
                    <span className="shrink-0 rounded-full bg-teal-soft px-3 py-1 text-sm font-bold text-teal">
                      ไปตามนัดแล้ว
                    </span>
                  ) : (
                    <form action={completeAppointment}>
                      <input type="hidden" name="id" value={a.id} />
                      <button type="submit" className="min-h-10 shrink-0 rounded-full bg-clay px-3 py-1 text-sm font-bold text-white">
                        ไปตามนัดแล้ว
                      </button>
                    </form>
                  )}
                </div>
                {!a.done && (
                  <div className="mt-3">
                    <ShareButton
                      label="แชร์การ์ดนัดไป LINE"
                      text={`นัดของ${patient.name}\n${a.note ?? "นัดหมอ"}\n${fmt(a.at)}\nเตรียม: บัตรประชาชน · ใบนัด · ยาที่ใช้อยู่ · สรุปจากสมุด\nส่งจากหมอนำทาง`}
                    />
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Visit note */}
      <section>
        <h3 className="mb-3 text-xl font-bold">บันทึกการรักษาจากนัด</h3>
        <form action={addVisitNote} className="space-y-4 rounded-2xl border border-line bg-card p-5">
          <label className="block">
            <span className="mb-1 block font-bold">อาการหรือโรคที่หมอบอก</span>
            <textarea name="symptom" rows={2} placeholder="เช่น ความดันสูงเล็กน้อย ปรับยาเพิ่ม" className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block font-bold">ยาที่ได้รับมา</span>
            <textarea name="medsReceived" rows={2} placeholder="เช่น ยาความดัน 1 เม็ดเช้า" className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block font-bold">นัดครั้งถัดไป (ถ้ามี)</span>
            <input name="nextAppointment" placeholder="เช่น อีก 1 เดือน" className={inputCls} />
          </label>
          <button type="submit" className="w-full rounded-xl bg-teal py-3 text-lg font-bold text-white">
            เก็บบันทึกการรักษา
          </button>
        </form>

        {visits.length > 0 && (
          <div className="mt-3 space-y-2">
            {visits.map((v) => (
              <article key={v.id} className="rounded-2xl border border-line bg-card p-4">
                <time className="text-sm text-muted-foreground">{fmt(v.at)}</time>
                {v.symptom && <p className="mt-1"><b>อาการ:</b> {v.symptom}</p>}
                {v.medsReceived && <p><b>ยาที่ได้รับ:</b> {v.medsReceived}</p>}
                {v.nextAppointment && <p><b>นัดถัดไป:</b> {v.nextAppointment}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}