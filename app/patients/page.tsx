// ponytail: per-request read — the patient list can change (create/select).
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { PID_COOKIE, getUserId } from "@/lib/patient";
import { cookies } from "next/headers";
import { selectPatient, createPatient, careForSelf, logout } from "./actions";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";

export default async function PatientsPage() {
  const uid = (await getUserId())!; // middleware guarantees a value here
  const [user, patients, activeId] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: uid } }),
    db.patient.findMany({ where: { caregivers: { some: { id: uid } } }, orderBy: { createdAt: "asc" } }),
    cookies().then((c) => c.get(PID_COOKIE)?.value),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="screen-title">เลือกผู้รับการดูแลที่จะดูแล</h2>
        <form action={logout}>
          <SubmitButton className="shrink-0 text-sm font-bold text-clay" pendingText="กำลังออก…">
            ออก ({user.name ?? user.lineId})
          </SubmitButton>
        </form>
      </div>
      <p className="text-muted-foreground">
        {patients.length ? "แตะที่ชื่อเพื่อเข้าดูสมุดของท่านนั้นค่ะ" : "ยังไม่มีผู้รับการดูแลในรหัสนี้ เพิ่มคนแรกได้เลยค่ะ"}
      </p>

      <div className="space-y-3">
        {patients.map((p) => (
          <form key={p.id} action={selectPatient.bind(null, p.id)}>
            <SubmitButton
              className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left ${
                p.id === activeId ? "border-teal bg-teal-soft" : "border-line bg-card"
              }`}
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-teal text-xl font-extrabold text-white">
                {p.name.replace(/^(แม่|พ่อ)/, "").trim().charAt(0) || "ม"}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-lg">{p.name}</strong>
                <span className="text-sm text-muted-foreground">
                  {[p.age ? `${p.age} ปี` : null, p.coverage].filter(Boolean).join(" · ") || "ยังไม่มีข้อมูล"}
                </span>
              </span>
              {p.id === activeId && <span className="ml-auto font-bold text-teal">กำลังดูแล ✓</span>}
            </SubmitButton>
          </form>
        ))}
      </div>

      <section className="space-y-3 rounded-2xl border border-dashed border-line p-5">
        <strong className="block text-teal">เพิ่มผู้รับการดูแลคนใหม่</strong>
        <form action={createPatient} className="space-y-3">
          <Input name="name" required placeholder="ชื่อ เช่น แม่สมทรง ใจดี" className="bg-ivory" />
          <Input name="age" type="number" min={0} max={130} placeholder="อายุ (ไม่บังคับ)" className="bg-ivory" />
          <SubmitButton className="btn-primary" pendingText="กำลังเพิ่ม…">＋ เพิ่มแล้วเริ่มดูแล</SubmitButton>
        </form>
        {/* ponytail: quick self-care setup for testing — one tap, no form. */}
        <form action={careForSelf}>
          <SubmitButton className="text-sm font-bold text-teal" pendingText="กำลังสร้าง…">＋ ดูแลตัวเอง (สำหรับทดสอบ)</SubmitButton>
        </form>
      </section>
    </div>
  );
}
