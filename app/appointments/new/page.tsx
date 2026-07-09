import Link from "next/link";
import { addAppointment } from "../actions";

// New-appointment form (prototype screen 12).
export default function NewAppointment() {
  return (
    <div className="space-y-4">
      <Link href="/appointments" className="back-link">← นัดของม้า</Link>
      <div>
        <p className="eyebrow">เพิ่มเข้าปฏิทินของบ้าน</p>
        <h2 className="screen-title">จดนัดใหม่</h2>
        <p className="lead">ใส่เท่าที่มี เดี๋ยวสมุดช่วยรวมไว้ให้ค่ะ</p>
      </div>

      <form action={addAppointment} className="flow-form">
        <label>
          <span>เรื่องที่นัด</span>
          <input name="note" required placeholder="เช่น ติดตามอายุรกรรมหัวใจ" />
        </label>
        <label>
          <span>โรงพยาบาลหรือสถานที่</span>
          <input name="place" placeholder="เช่น รพ.เจริญกรุงประชารักษ์" />
        </label>
        <div className="form-grid">
          <label>
            <span>วันที่</span>
            <input name="date" type="date" required />
          </label>
          <label>
            <span>เวลา</span>
            <input name="time" type="time" />
          </label>
        </div>
        <label>
          <span>จดเพิ่มได้ (ไม่บังคับ)</span>
          <textarea name="extra" rows={3} placeholder="เช่น นำผลเลือดไปด้วย" />
        </label>
        <button type="submit" className="btn-primary">เก็บนัดลงสมุด</button>
      </form>
    </div>
  );
}
