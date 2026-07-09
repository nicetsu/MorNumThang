// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";

export default async function Profile() {
  const patient = await db.patient.findFirst();

  if (!patient) {
    return <p className="py-8 text-muted-foreground">ยังไม่มีข้อมูลม้าค่ะ</p>;
  }

  return (
    <div className="space-y-6 py-2">
      <h2 className="text-2xl font-extrabold text-teal">โปรไฟล์</h2>

      <article className="flex items-center gap-4 rounded-2xl border border-line bg-card p-5">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-teal-soft text-xl font-bold text-teal">
          ม้า
        </div>
        <div>
          <strong className="block text-lg">{patient.name}</strong>
          {patient.diseases && (
            <p className="text-sm text-muted-foreground">{patient.diseases}</p>
          )}
        </div>
      </article>

      <section>
        <h3 className="mb-2 text-xl font-bold">คู่มือดูแล</h3>
        {patient.careGuide ? (
          <p className="whitespace-pre-line rounded-2xl border border-line bg-card p-4">
            {patient.careGuide}
          </p>
        ) : (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted-foreground">
            ยังไม่มีคู่มือดูแล
          </p>
        )}
      </section>
    </div>
  );
}