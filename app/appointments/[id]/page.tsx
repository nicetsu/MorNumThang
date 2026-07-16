// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getActivePatient } from "@/lib/patient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { completeAppointment, rescheduleAppointment, addVisitNote } from "../actions";
import { ShareButton } from "@/components/share-button";
import { SubmitButton } from "@/components/submit-button";
import { BackLink } from "@/components/back-link";

const PREP = ["บัตรประชาชนและใบนัด", "ยาที่ใช้อยู่ หรือถ่ายรูปฉลากยา", "สรุปจากสมุดของผู้รับการดูแล"];

function fmt(at: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(at);
}

export default async function AppointmentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [patient, appt] = await Promise.all([
    getActivePatient(),
    db.appointment.findUnique({ where: { id } }),
  ]);
  if (!appt) notFound();

  return (
    <div className="space-y-4">
      <BackLink fallback="/appointments">กลับ</BackLink>
      <div>
        <p className="eyebrow">นัดถัดไปของผู้รับการดูแล</p>
        <h2 className="screen-title">{fmt(appt.at)}</h2>
      </div>

      <article className="appointment-hero">
        <small>{appt.note ?? "นัดหมอ"}</small>
        <strong>{appt.place ?? "โรงพยาบาล"}</strong>
        <p>&nbsp;</p>
        <div className="tags">
          <span>{appt.done ? "ไปตามนัดแล้ว" : "นัดถัดไป"}</span>
        </div>
      </article>

      <article className="prep-card">
        <h3 className="mb-2 text-[22px] font-extrabold text-teal">เตรียมไปด้วย</h3>
        <ul className="list-disc space-y-1 pl-6">
          {PREP.map((p) => <li key={p}>{p}</li>)}
        </ul>
        <Link href="/summary" className="btn-outline mt-4 grid place-items-center">
          เปิดสรุปให้หมอ
        </Link>
      </article>

      {/* Complete / reschedule */}
      <div className="button-row">
        {appt.done ? (
          <span className="secondary-action grid place-items-center !text-muted-foreground">ไปตามนัดแล้ว</span>
        ) : (
          <form action={completeAppointment}>
            <input type="hidden" name="id" value={appt.id} />
            <SubmitButton className="secondary-action w-full" pendingText="กำลังบันทึก…">ไปตามนัดแล้ว</SubmitButton>
          </form>
        )}
        <ShareButton
          label="แชร์ไป LINE"
          className="secondary-action w-full"
          text={`นัดของ${patient?.name ?? "ผู้รับการดูแล"}\n${appt.note ?? "นัดหมอ"}${appt.place ? `\n${appt.place}` : ""}\n${fmt(appt.at)}\nเตรียม: ${PREP.join(" · ")}\nส่งจากหมอนำทาง`}
        />
      </div>

      {!appt.done && (
        <details className="rounded-[14px] border border-line bg-card p-4">
          <summary className="cursor-pointer font-bold text-teal">เลื่อนนัด</summary>
          <form action={rescheduleAppointment} className="mt-2 flex items-end gap-2">
            <input type="hidden" name="id" value={appt.id} />
            <Input name="date" type="date" required className="min-h-10 flex-1 rounded-xl bg-ivory px-3 text-base" />
            <Input name="time" type="time" className="min-h-10 rounded-xl bg-ivory px-3 text-base" />
            <SubmitButton className="min-h-10 rounded-xl bg-teal px-4 font-bold text-white" pendingText="…">เลื่อน</SubmitButton>
          </form>
        </details>
      )}

      {/* Visit note */}
      <form action={addVisitNote} className="flow-form border-t border-dashed border-line pt-4">
        <div className="section-heading"><h3>บันทึกการรักษาจากนัดนี้</h3></div>
        <label>
          <span>อาการหรือโรคที่หมอบอก</span>
          <Textarea name="symptom" rows={2} placeholder="เช่น ความดันสูงเล็กน้อย ปรับยาเพิ่ม" />
        </label>
        <label>
          <span>ยาที่ได้รับมา</span>
          <Textarea name="medsReceived" rows={2} placeholder="เช่น ยาความดัน 1 เม็ดเช้า" />
        </label>
        <label>
          <span>นัดครั้งถัดไป (ถ้ามี)</span>
          <Input name="nextAppointment" placeholder="เช่น อีก 1 เดือน" />
        </label>
        <SubmitButton className="btn-primary" pendingText="กำลังเก็บ…">เก็บบันทึกการรักษา</SubmitButton>
      </form>
    </div>
  );
}
