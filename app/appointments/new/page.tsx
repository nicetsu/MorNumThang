// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { getActivePatient } from "@/lib/patient";
import { AppointmentForm } from "./appointment-form";

// New-appointment screen (prototype screen 12) with followup cards from past appointments.
export default async function NewAppointment() {
  const patient = await getActivePatient();
  const appts = await db.appointment.findMany({ orderBy: { at: "desc" } });
  const facilities = await db.facility.findMany({ orderBy: { name: "asc" } });

  // Followup cards: distinct past appointments (by reason) to reuse.
  const seen = new Set<string>();
  const followups = appts
    .filter((a) => a.note && !seen.has(a.note) && seen.add(a.note))
    .slice(0, 4)
    .map((a) => ({ note: a.note!, place: a.place }));

  // Hospital suggestions: places used before + the patient's hospital first (most relevant),
  // then the seeded Bangkok facilities. de-duped, order preserved.
  const hospitals = [
    ...new Set(
      [
        ...appts.map((a) => a.place),
        patient?.hospital,
        ...facilities.map((f) => f.name),
      ].filter((h): h is string => !!h),
    ),
  ];

  return (
    <div className="space-y-4">
      <Link href="/appointments" className="back-link">← นัดของม้า</Link>
      <div>
        <p className="eyebrow">เพิ่มเข้าปฏิทินของบ้าน</p>
        <h2 className="screen-title">จดนัดใหม่</h2>
        <p className="lead">ใส่เท่าที่มี เดี๋ยวสมุดช่วยรวมไว้ให้ค่ะ</p>
      </div>
      <AppointmentForm followups={followups} hospitals={hospitals} />
    </div>
  );
}
