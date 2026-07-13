import Link from "next/link";

// ponytail: contacts hardcoded — no contact data model in v1 (PLAN §6). Real numbers when a
// patient's care team is stored.
const contacts = [
  { name: "รพ.เจริญกรุงประชารักษ์", sub: "โรงพยาบาลตามสิทธิบัตรทอง", tel: "022897000" },
  { name: "สายด่วน สปสช.", sub: "สอบถามสิทธิบัตรทอง", tel: "1330" },
];

export default function Urgent() {
  return (
    <div className="space-y-4">
      <Link href="/" className="back-link">← สมุดของผู้รับการดูแล</Link>
      <div>
        <p className="eyebrow">เมื่อเกิดเรื่อง</p>
        <h2 className="screen-title !text-red">ใจเย็น ๆ นะคะ<br />เราไปทีละขั้น</h2>
      </div>

      {/* Step 1 — calm actions */}
      <article className="path-card">
        <span className="path-number absolute left-[18px] top-[18px] grid size-[42px] place-items-center rounded-full bg-teal-soft font-extrabold text-teal">1</span>
        <div className="pl-[54px]">
          <small className="text-muted-foreground">ทางที่หนึ่ง</small>
          <h3 className="text-[26px] font-extrabold text-teal">ดูแลตอนนี้</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-6">
            <li>อยู่กับผู้รับการดูแลในจุดที่ปลอดภัย</li>
            <li>จดเวลาเริ่มและสิ่งที่เปลี่ยน</li>
            <li>เตรียมยาและสมุดของผู้รับการดูแลไว้ใกล้ตัว</li>
          </ol>
        </div>
      </article>

      {/* Step 2 — contacts */}
      <article className="path-card pro">
        <span className="path-number absolute left-[18px] top-[18px] grid size-[42px] place-items-center rounded-full bg-white font-extrabold text-teal">2</span>
        <div className="pl-[54px]">
          <small className="text-muted-foreground">ทางที่สอง</small>
          <h3 className="text-[26px] font-extrabold text-teal">โทรหามือโปร</h3>
        </div>
        <a href="tel:1669" className="emergency-card mt-3">
          <strong>1669</strong>
          <span>เจ็บป่วยฉุกเฉิน<small className="block text-muted-foreground">โทรฟรีตลอด 24 ชม.</small></span>
          <b>โทร</b>
        </a>
        {contacts.map((c) => (
          <a key={c.tel} href={`tel:${c.tel}`} className="contact-card mt-[10px]">
            <span>
              <strong className="block">{c.name}</strong>
              <small className="text-muted-foreground">{c.sub}</small>
            </span>
            <b>โทร</b>
          </a>
        ))}
      </article>

      <p className="safety-line">
        หมอนำทางช่วยจัดลำดับและเตรียมข้อมูล ไม่ได้ประเมินความฉุกเฉินแทนบุคลากรทางการแพทย์
      </p>
    </div>
  );
}
