// ponytail: per-request read — the patient list can change (create/select).
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { PID_COOKIE } from "@/lib/patient";
import { cookies } from "next/headers";
import { selectPatient, createPatient } from "./actions";
import { Input } from "@/components/ui/input";

export default async function PatientsPage() {
  const [patients, activeId] = await Promise.all([
    db.patient.findMany({ orderBy: { createdAt: "asc" } }),
    cookies().then((c) => c.get(PID_COOKIE)?.value),
  ]);

  return (
    <div className="space-y-6">
      <h2 className="screen-title">เลือกม้าที่จะดูแล</h2>
      <p className="text-muted-foreground">แตะที่ชื่อเพื่อเข้าดูสมุดของท่านนั้นค่ะ</p>

      <div className="space-y-3">
        {patients.map((p) => (
          <form key={p.id} action={selectPatient.bind(null, p.id)}>
            <button
              type="submit"
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
            </button>
          </form>
        ))}
      </div>

      <section className="space-y-3 rounded-2xl border border-dashed border-line p-5">
        <strong className="block text-teal">เพิ่มม้าคนใหม่</strong>
        <form action={createPatient} className="space-y-3">
          <Input name="name" required placeholder="ชื่อ เช่น แม่สมทรง ใจดี" className="bg-ivory" />
          <Input name="age" type="number" min={0} max={130} placeholder="อายุ (ไม่บังคับ)" className="bg-ivory" />
          <button type="submit" className="btn-primary">＋ เพิ่มแล้วเริ่มดูแล</button>
        </form>
      </section>
    </div>
  );
}
