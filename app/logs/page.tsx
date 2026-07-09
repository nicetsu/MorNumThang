// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { addWeight } from "./actions";
import { RecordTabs } from "./record-tabs";

// Record screen (prototype screen 1): just the two-tab form. The full log history
// lives on /signals ("บันทึกของม้า").
export default function Logs() {
  const weightForm = (
    <form action={addWeight} className="flow-form">
      <label>
        <span>น้ำหนักวันนี้</span>
        <div className="unit-input">
          <input name="kg" type="number" step="0.1" min="1" max="400" inputMode="decimal" required />
          <b>กก.</b>
        </div>
      </label>
      <label>
        <span>ความดันโลหิต (ไม่บังคับ)</span>
        <div className="form-grid">
          <div className="unit-input">
            <input name="systolic" type="number" min="40" max="300" inputMode="numeric" placeholder="ตัวบน" aria-label="ความดันตัวบน" />
            <b>บน</b>
          </div>
          <div className="unit-input">
            <input name="diastolic" type="number" min="30" max="200" inputMode="numeric" placeholder="ตัวล่าง" aria-label="ความดันตัวล่าง" />
            <b>ล่าง</b>
          </div>
        </div>
      </label>
      <label>
        <span>ชีพจร (ไม่บังคับ)</span>
        <div className="unit-input">
          <input name="pulse" type="number" min="20" max="250" inputMode="numeric" placeholder="เช่น 72" />
          <b>ครั้ง/นาที</b>
        </div>
      </label>
      <label>
        <span>วันที่บันทึก</span>
        <input name="date" type="date" />
      </label>
      <label>
        <span>จดเพิ่มได้ (ไม่บังคับ)</span>
        <textarea name="note" rows={2} placeholder="เช่น ชั่งก่อนอาหารเช้า" />
      </label>
      <button type="submit" className="btn-primary">เก็บลงสมุด</button>
    </form>
  );

  return (
    <div className="space-y-6">
      <Link href="/" className="back-link">← สมุดของม้า</Link>
      <div>
        <p className="eyebrow">บันทึกลงสมุดของม้า</p>
        <h2 className="screen-title">วันนี้อยากจดอะไรดีคะ</h2>
      </div>

      <RecordTabs weightForm={weightForm} />

      <Link href="/signals" className="block text-center font-bold text-teal">
        ดูบันทึกทั้งหมดของม้า →
      </Link>
    </div>
  );
}