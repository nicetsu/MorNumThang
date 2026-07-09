// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { addAllergy, removeAllergy } from "./actions";
import { MedForm } from "./med-form";

export default async function MedList() {
  const patient = await db.patient.findFirst();
  if (!patient) {
    return <p className="py-8 text-muted-foreground">ยังไม่มีข้อมูลม้าค่ะ</p>;
  }

  const [allergies, meds] = await Promise.all([
    db.allergy.findMany({ where: { patientId: patient.id }, orderBy: { name: "asc" } }),
    db.medication.findMany({ where: { patientId: patient.id }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6 py-2">
      <Link href="/meds" className="inline-block font-bold text-teal">
        ← รักษา
      </Link>
      <h2 className="text-2xl font-extrabold text-teal">ยาที่ต้องทาน</h2>

      <section>
        <h3 className="mb-2 text-xl font-bold">ยาที่แพ้</h3>
        <div className="mb-3 flex flex-wrap gap-2">
          {allergies.length === 0 ? (
            <p className="text-muted-foreground">ยังไม่มีข้อมูลยาที่แพ้</p>
          ) : (
            allergies.map((a) => (
              <form key={a.id} action={removeAllergy}>
                <input type="hidden" name="id" value={a.id} />
                <button
                  type="submit"
                  className="flex min-h-11 items-center gap-2 rounded-full bg-red-soft px-4 font-bold text-red"
                  aria-label={`ลบ ${a.name}`}
                >
                  {a.name} <span aria-hidden>×</span>
                </button>
              </form>
            ))
          )}
        </div>
        <form action={addAllergy} className="flex gap-2">
          <input
            name="name"
            placeholder="เพิ่มยาที่แพ้"
            className="flex-1 rounded-xl border border-line bg-ivory px-4 py-3"
          />
          <button type="submit" className="rounded-xl bg-clay px-5 py-3 font-bold text-white">
            เพิ่ม
          </button>
        </form>
        <p className="mt-2 text-sm text-muted-foreground">
          ! ยาที่แพ้จะถูกล็อกไว้ในรายการ เลือกไม่ได้เพื่อความปลอดภัย
        </p>
      </section>

      <section>
        <h3 className="mb-2 text-xl font-bold">เพิ่มยา</h3>
        <MedForm allergies={allergies.map((a) => a.name)} />
      </section>

      <section>
        <h3 className="mb-3 text-xl font-bold">ตารางยา</h3>
        {meds.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted-foreground">
            ยังไม่มีรายการยา
          </p>
        ) : (
          <div className="space-y-2">
            {meds.map((m) => (
              <article key={m.id} className="rounded-2xl border border-line bg-card p-4">
                <strong className="text-lg">{m.name}</strong>
                {m.schedule && (
                  <p className="text-sm text-muted-foreground">{m.schedule}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}