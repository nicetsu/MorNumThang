// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { addWeight } from "./actions";

// Thai date + time, e.g. "9 ก.ค. · 07:30"
function fmt(at: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(at);
}

export default async function Logs() {
  const logs = await db.weightLog.findMany({ orderBy: { at: "desc" } });

  return (
    <div className="space-y-6 py-2">
      <Link href="/" className="inline-block font-bold text-teal">
        ← สมุดของม้า
      </Link>
      <div>
        <p className="text-sm text-muted-foreground">ประวัติการดูแลม้า</p>
        <h2 className="text-2xl font-extrabold text-teal">บันทึกน้ำหนัก</h2>
      </div>

      <form action={addWeight} className="space-y-4 rounded-2xl border border-line bg-card p-5">
        <label className="block">
          <span className="mb-1 block font-bold">น้ำหนักวันนี้</span>
          <div className="flex items-center gap-2">
            <input
              name="kg"
              type="number"
              step="0.1"
              min="1"
              max="400"
              inputMode="decimal"
              required
              className="w-full rounded-xl border border-line bg-ivory px-4 py-3 text-lg"
            />
            <b className="text-muted-foreground">กก.</b>
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block font-bold">วันที่บันทึก</span>
          <input
            name="date"
            type="date"
            className="w-full rounded-xl border border-line bg-ivory px-4 py-3 text-lg"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold">จดเพิ่มได้ (ไม่บังคับ)</span>
          <textarea
            name="note"
            rows={2}
            placeholder="เช่น ชั่งก่อนอาหารเช้า"
            className="w-full rounded-xl border border-line bg-ivory px-4 py-3"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-xl bg-teal py-3 text-lg font-bold text-white"
        >
          บันทึกน้ำหนัก
        </button>
      </form>

      <section>
        <h3 className="mb-3 text-xl font-bold">บันทึกทั้งหมด</h3>
        {logs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted-foreground">
            ยังไม่มีบันทึก
          </p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <article
                key={log.id}
                className="flex items-baseline gap-3 rounded-2xl border border-line bg-card p-4"
              >
                <time className="w-28 shrink-0 text-sm text-muted-foreground">
                  {fmt(log.at)}
                </time>
                <div>
                  <strong className="text-lg">{log.kg} กก.</strong>
                  {log.note && (
                    <p className="text-sm text-muted-foreground">{log.note}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}