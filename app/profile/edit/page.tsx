// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { getActivePatient } from "@/lib/patient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ComboField } from "@/components/combo-field";
import { MultiComboField } from "@/components/multi-combo-field";
import { saveProfile } from "./actions";
import { SubmitButton } from "@/components/submit-button";

// โรคประจำตัว is multi-value — a fixed pick-list (typing a custom disease still works).
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

// อาชีพ has no reference table — a small fixed pick-list (typing a custom value still works).
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

export default async function ProfileEdit() {
  const patient = await getActivePatient();
  if (!patient) {
    return <p className="py-8 text-muted-foreground">ยังไม่มีข้อมูลผู้รับการดูแลค่ะ</p>;
  }

  // Dropdown data from the seeded reference tables (same source lib/rights.ts uses).
  const [rights, facilities] = await Promise.all([
    db.healthRight.findMany({ orderBy: { id: "asc" }, select: { name: true } }),
    // distinct name — the seed has a few facilities sharing a name; the dropdown wants each once.
    db.facility.findMany({ distinct: ["name"], orderBy: { name: "asc" }, select: { name: true } }),
  ]);
  const coverageOptions = rights.map((r) => ({ value: r.name, label: r.name }));
  const hospitalOptions = facilities.map((f) => ({ value: f.name, label: f.name }));
  const jobOptions = JOB_OPTIONS.map((o) => ({ value: o, label: o }));
  const diseaseOptions = DISEASE_OPTIONS.map((o) => ({ value: o, label: o }));

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
        <ComboField
          name="coverage"
          label="สิทธิการรักษา"
          options={coverageOptions}
          defaultValue={patient.coverage ?? ""}
          placeholder="— เลือกสิทธิ —"
          searchPlaceholder="ค้นหาสิทธิ…"
        />
        <ComboField
          name="hospital"
          label="โรงพยาบาลตามสิทธิ์"
          options={hospitalOptions}
          defaultValue={patient.hospital ?? ""}
          placeholder="— เลือกโรงพยาบาล —"
          searchPlaceholder="ค้นหาโรงพยาบาล…"
        />
        <ComboField
          name="job"
          label="อาชีพ / อดีตอาชีพ"
          options={jobOptions}
          defaultValue={patient.job ?? ""}
          placeholder="— เลือกอาชีพ —"
          searchPlaceholder="ค้นหา/พิมพ์อาชีพ…"
        />
        <label>
          <span>คนดูแลหลัก</span>
          <Input name="caregiver" defaultValue={patient.caregiver ?? ""} placeholder="เช่น เจี๊ยบ · ผู้ดูแลหลัก" />
        </label>
        <label>
          <span>เบอร์โทรคนดูแล (ไม่บังคับ)</span>
          <Input name="caregiverPhone" type="tel" inputMode="tel" defaultValue={patient.caregiverPhone ?? ""} placeholder="เช่น 0812345678" />
        </label>
        <MultiComboField
          name="diseases"
          label="โรคประจำตัว"
          options={diseaseOptions}
          defaultValue={patient.diseases ?? ""}
          placeholder="— เลือกได้หลายโรค —"
          searchPlaceholder="ค้นหา/พิมพ์โรค…"
        />
        <label>
          <span>สิ่งที่ชอบ</span>
          <Textarea name="likes" rows={2} defaultValue={patient.likes ?? ""} />
        </label>
        <SubmitButton className="btn-primary" pendingText="กำลังบันทึก…">บันทึกประวัติ</SubmitButton>
      </form>
    </div>
  );
}
