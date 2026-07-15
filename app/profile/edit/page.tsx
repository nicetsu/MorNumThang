// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { getActivePatient } from "@/lib/patient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveProfile } from "./actions";
import { SubmitButton } from "@/components/submit-button";

// Suggestion lists for the datalist dropdowns. Free text still allowed — these only prompt.
const COVERAGE_OPTIONS = ["บัตรทอง", "ประกันสังคม", "ข้าราชการ/รัฐวิสาหกิจ", "สิทธิท้องถิ่น (อปท.)", "ชำระเงินเอง"];
const HOSPITAL_OPTIONS = [
  "โรงพยาบาลศิริราช",
  "โรงพยาบาลรามาธิบดี",
  "โรงพยาบาลจุฬาลงกรณ์",
  "โรงพยาบาลราชวิถี",
  "โรงพยาบาลตำรวจ",
];
const JOB_OPTIONS = [
  "รับราชการ",
  "ข้าราชการบำนาญ",
  "ค้าขาย",
  "เกษตรกร",
  "พนักงานบริษัท",
  "รับจ้างทั่วไป",
  "แม่บ้าน",
  "ธุรกิจส่วนตัว",
  "เกษียณอายุ",
];
const DISEASE_OPTIONS = [
  "ความดันโลหิตสูง",
  "เบาหวาน",
  "ไขมันในเลือดสูง",
  "โรคหัวใจ",
  "โรคไตเรื้อรัง",
  "หอบหืด",
  "ถุงลมโป่งพอง",
  "อัมพฤกษ์/อัมพาต",
  "ข้อเข่าเสื่อม",
  "สมองเสื่อม/อัลไซเมอร์",
  "เกาต์",
  "ไทรอยด์",
];

export default async function ProfileEdit() {
  const patient = await getActivePatient();
  if (!patient) {
    return <p className="py-8 text-muted-foreground">ยังไม่มีข้อมูลผู้รับการดูแลค่ะ</p>;
  }

  return (
    <div className="space-y-4">
      <Link href="/profile" className="back-link">← โปรไฟล์</Link>
      <div>
        <p className="eyebrow">โปรไฟล์ของผู้รับการดูแล</p>
        <h2 className="screen-title">แก้ไขประวัติ</h2>
      </div>

      <form action={saveProfile} className="flow-form">
        <div className="form-grid">
          <label>
            <span>ชื่อที่เรียก</span>
            <Input name="name" defaultValue={patient.name} required />
          </label>
          <label>
            <span>อายุ</span>
            <Input name="age" type="number" min="0" max="130" defaultValue={patient.age ?? ""} />
          </label>
        </div>
        <label>
          <span>สิทธิการรักษา</span>
          <Input name="coverage" list="coverage-options" defaultValue={patient.coverage ?? ""} placeholder="เลือกหรือพิมพ์ เช่น บัตรทอง" />
          <datalist id="coverage-options">
            {COVERAGE_OPTIONS.map((o) => <option key={o} value={o} />)}
          </datalist>
        </label>
        <label>
          <span>โรงพยาบาลตามสิทธิ์</span>
          <Input name="hospital" list="hospital-options" defaultValue={patient.hospital ?? ""} placeholder="เลือกหรือพิมพ์ชื่อโรงพยาบาล" />
          <datalist id="hospital-options">
            {HOSPITAL_OPTIONS.map((o) => <option key={o} value={o} />)}
          </datalist>
        </label>
        <label>
          <span>อาชีพ / อดีตอาชีพ</span>
          <Input name="job" list="job-options" defaultValue={patient.job ?? ""} placeholder="เลือกหรือพิมพ์อาชีพ" />
          <datalist id="job-options">
            {JOB_OPTIONS.map((o) => <option key={o} value={o} />)}
          </datalist>
        </label>
        <label>
          <span>คนดูแลหลัก</span>
          <Input name="caregiver" defaultValue={patient.caregiver ?? ""} placeholder="เช่น เจี๊ยบ · ผู้ดูแลหลัก" />
        </label>
        <label>
          <span>เบอร์โทรคนดูแล (ไม่บังคับ)</span>
          <Input name="caregiverPhone" type="tel" inputMode="tel" defaultValue={patient.caregiverPhone ?? ""} placeholder="เช่น 0812345678" />
        </label>
        <label>
          <span>โรคประจำตัว</span>
          <Input name="diseases" list="disease-options" defaultValue={patient.diseases ?? ""} placeholder="เลือกหรือพิมพ์ เช่น ความดันโลหิตสูง · เบาหวาน" />
          <datalist id="disease-options">
            {DISEASE_OPTIONS.map((o) => <option key={o} value={o} />)}
          </datalist>
        </label>
        <label>
          <span>สิ่งที่ชอบ</span>
          <Textarea name="likes" rows={2} defaultValue={patient.likes ?? ""} />
        </label>
        <SubmitButton className="btn-primary" pendingText="กำลังบันทึก…">บันทึกประวัติ</SubmitButton>
      </form>
    </div>
  );
}
