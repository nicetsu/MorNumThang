// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { HealthSignals } from "@/components/health-signals";

// ponytail: single-patient v1 — first patient is "ม้า". Multi-patient when real (PLAN §6).
export default async function Home() {
  const patient = await db.patient.findFirst();

  if (!patient) {
    return <p className="py-8 text-muted-foreground">ยังไม่มีข้อมูลม้าค่ะ</p>;
  }

  return (
    <div className="space-y-6 py-2">
      <h2 className="text-3xl font-extrabold text-teal">{patient.name}</h2>

      <HealthSignals />

      <Link
        href="/summary"
        className="block rounded-2xl border border-line bg-teal-soft p-5"
      >
        <small className="text-muted-foreground">จากบันทึกของม้า</small>
        <strong className="mt-1 block text-lg text-teal">สรุปให้หมอ →</strong>
        <em className="text-sm text-muted-foreground not-italic">
          รวมบันทึกเป็นสรุปสำหรับคุณหมอด้วย AI
        </em>
      </Link>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xl font-bold">บันทึกล่าสุด</h3>
          <Link href="/logs" className="font-bold text-clay">
            + บันทึก
          </Link>
        </div>
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted-foreground">
          ยังไม่มีบันทึก แตะ “+ บันทึก” เพื่อเริ่มค่ะ
        </p>
      </section>
    </div>
  );
}