// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { getActivePatient } from "@/lib/patient";

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

export default async function Appointments() {
  const patient = await getActivePatient();
  if (!patient) {
    return <p className="py-8 text-muted-foreground">ยังไม่มีข้อมูลผู้รับการดูแลค่ะ</p>;
  }

  const appts = await db.appointment.findMany({
    where: { patientId: patient.id },
    orderBy: { at: "asc" },
  });
  const upcoming = appts.filter((a) => !a.done);
  const past = appts.filter((a) => a.done);

  return (
    <div className="space-y-5">
      <Link href="/meds" className="back-link">← ยา &amp; นัด</Link>
      <div>
        <p className="eyebrow">นัดหมายของผู้รับการดูแล</p>
        <h2 className="screen-title">นัดของผู้รับการดูแล</h2>
        <p className="lead">ดูนัดถัดไปและสิ่งที่ต้องเตรียมก่อนไปโรงพยาบาลค่ะ</p>
      </div>

      <div className="section-heading">
        <h3>นัดถัดไป</h3>
        <Link href="/appointments/new">+ เพิ่มนัด</Link>
      </div>
      {upcoming.length === 0 ? (
        <p className="rounded-[18px] border border-dashed border-line p-6 text-center text-muted-foreground">
          ยังไม่มีนัดหมาย
        </p>
      ) : (
        <div className="space-y-3">
          {upcoming.map((a) => (
            <article key={a.id} className="appointment-card">
              <small>{fmt(a.at)}</small>
              <strong>{a.note ?? "นัดหมอ"}</strong>
              <p>{a.place ?? " "}</p>
              <Link href={`/appointments/${a.id}`}>ดูนัด</Link>
            </article>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <>
          <div className="section-heading"><h3>นัดก่อนหน้า</h3></div>
          <div className="space-y-3">
            {past.map((a) => (
              <article key={a.id} className="appointment-card">
                <small>{fmt(a.at)}</small>
                <strong>{a.note ?? "นัดหมอ"}</strong>
                <p>{[a.place, "ไปตามนัดแล้ว"].filter(Boolean).join(" · ")}</p>
                <Link href={`/appointments/${a.id}`}>ดูนัด</Link>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
