// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveProfile } from "./actions";

export default async function ProfileEdit() {
  const patient = await db.patient.findFirst();
  if (!patient) {
    return <p className="py-8 text-muted-foreground">ยังไม่มีข้อมูลม้าค่ะ</p>;
  }

  return (
    <div className="space-y-4">
      <Link href="/profile" className="back-link">← โปรไฟล์</Link>
      <div>
        <p className="eyebrow">โปรไฟล์ของม้า</p>
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
          <Input name="coverage" defaultValue={patient.coverage ?? ""} placeholder="เช่น บัตรทอง" />
        </label>
        <label>
          <span>โรงพยาบาลตามสิทธิ์</span>
          <Input name="hospital" defaultValue={patient.hospital ?? ""} />
        </label>
        <label>
          <span>อาชีพ / อดีตอาชีพ</span>
          <Input name="job" defaultValue={patient.job ?? ""} />
        </label>
        <label>
          <span>คนดูแลหลัก</span>
          <Input name="caregiver" defaultValue={patient.caregiver ?? ""} placeholder="เช่น เจี๊ยบ · ผู้ดูแลหลัก" />
        </label>
        <label>
          <span>โรคประจำตัว</span>
          <Textarea name="diseases" rows={2} defaultValue={patient.diseases ?? ""} placeholder="เช่น ความดันโลหิตสูง · โรคหัวใจ" />
        </label>
        <label>
          <span>สิ่งที่ชอบ</span>
          <Textarea name="likes" rows={2} defaultValue={patient.likes ?? ""} />
        </label>
        <button type="submit" className="btn-primary">บันทึกประวัติ</button>
      </form>
    </div>
  );
}
