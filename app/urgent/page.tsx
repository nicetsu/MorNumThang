import Link from "next/link";

// ponytail: contacts hardcoded — no contact data model in v1 (PLAN §6). Real numbers when a
// patient's care team is stored.
const contacts = [
  { name: "รพ.เจริญกรุงประชารักษ์", sub: "โรงพยาบาลตามสิทธิบัตรทอง", tel: "022897000" },
  { name: "สายด่วน สปสช.", sub: "สอบถามสิทธิบัตรทอง", tel: "1330" },
];

export default function Urgent() {
  return (
    <div className="space-y-5 py-2">
      <Link href="/" className="inline-block min-h-10 font-bold text-teal">
        ← สมุดของม้า
      </Link>
      <div>
        <p className="text-sm text-muted-foreground">เมื่อเกิดเรื่อง</p>
        <h2 className="text-2xl font-extrabold text-red">ใจเย็น ๆ นะคะ เราไปทีละขั้น</h2>
      </div>

      {/* Emergency call — biggest, first */}
      <a
        href="tel:1669"
        className="flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-red p-5 text-2xl font-extrabold text-white"
      >
        โทร 1669 · เจ็บป่วยฉุกเฉิน
      </a>

      {/* Step 1 — calm actions */}
      <article className="rounded-2xl border border-line bg-card p-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-teal-soft font-bold text-teal">
            1
          </span>
          <h3 className="text-lg font-bold">ดูแลตอนนี้</h3>
        </div>
        <ol className="list-decimal space-y-1 pl-6">
          <li>อยู่กับม้าในจุดที่ปลอดภัย</li>
          <li>จดเวลาเริ่มและสิ่งที่เปลี่ยน</li>
          <li>เตรียมยาและสมุดของม้าไว้ใกล้ตัว</li>
        </ol>
      </article>

      {/* Step 2 — contacts */}
      <article className="rounded-2xl border border-line bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-teal-soft font-bold text-teal">
            2
          </span>
          <h3 className="text-lg font-bold">โทรหามือโปร</h3>
        </div>
        <div className="space-y-2">
          {contacts.map((c) => (
            <a
              key={c.tel}
              href={`tel:${c.tel}`}
              className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-line p-3"
            >
              <span>
                <strong className="block">{c.name}</strong>
                <small className="text-muted-foreground">{c.sub}</small>
              </span>
              <b className="rounded-lg bg-teal px-4 py-2 text-white">โทร</b>
            </a>
          ))}
        </div>
      </article>

      <p className="text-sm text-muted-foreground">
        หมอนำทางช่วยจัดลำดับและเตรียมข้อมูล ไม่ได้ประเมินความฉุกเฉินแทนบุคลากรทางการแพทย์
      </p>
    </div>
  );
}
