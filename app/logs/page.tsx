// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addWeight } from "./actions";
import { RecordTabs } from "./record-tabs";
import { SubmitButton } from "@/components/submit-button";
import { BackLink } from "@/components/back-link";

// Record screen (prototype screen 1): just the two-tab form. The full log history
// lives on /signals ("บันทึกของผู้รับการดูแล").
export default function Logs() {
  const weightForm = (
    <form action={addWeight} className="flow-form">
      <label>
        <span>น้ำหนักวันนี้</span>
        <div className="unit-input">
          <Input className="pr-[58px]" name="kg" type="number" step="0.1" min="1" max="400" inputMode="decimal" required />
          <b>กก.</b>
        </div>
      </label>
      <label>
        <span>ความดันโลหิต (ไม่บังคับ)</span>
        <div className="form-grid">
          <div className="unit-input">
            <Input className="pr-[58px]" name="systolic" type="number" min="40" max="300" inputMode="numeric" placeholder="ตัวบน" aria-label="ความดันตัวบน" />
            <b>บน</b>
          </div>
          <div className="unit-input">
            <Input className="pr-[58px]" name="diastolic" type="number" min="30" max="200" inputMode="numeric" placeholder="ตัวล่าง" aria-label="ความดันตัวล่าง" />
            <b>ล่าง</b>
          </div>
        </div>
      </label>
      <label>
        <span>ชีพจร (ไม่บังคับ)</span>
        <div className="unit-input">
          <Input className="pr-[58px]" name="pulse" type="number" min="20" max="250" inputMode="numeric" placeholder="เช่น 72" />
          <b>ครั้ง/นาที</b>
        </div>
      </label>
      <label>
        <span>วันที่บันทึก</span>
        <Input name="date" type="date" />
      </label>
      <label>
        <span>จดเพิ่มได้ (ไม่บังคับ)</span>
        <Textarea name="note" rows={2} placeholder="เช่น ชั่งก่อนอาหารเช้า" />
      </label>
      <SubmitButton className="btn-primary" pendingText="กำลังเก็บ…">เก็บลงสมุด</SubmitButton>
    </form>
  );

  return (
    <div className="space-y-6">
      <BackLink href="/">สมุดของผู้รับการดูแล</BackLink>
      <div>
        <p className="eyebrow">บันทึกลงสมุดของผู้รับการดูแล</p>
        <h2 className="screen-title">วันนี้อยากจดอะไรดีคะ</h2>
      </div>

      <RecordTabs weightForm={weightForm} />

      <Link href="/signals" className="block text-center font-bold text-teal">
        ดูบันทึกทั้งหมดของผู้รับการดูแล <ArrowRight aria-hidden className="ml-1 inline size-[1em]" />
      </Link>
    </div>
  );
}