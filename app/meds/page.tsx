import Link from "next/link";

const cards = [
  { href: "/meds/list", icon: "ยา", title: "ยาที่ต้องทาน", desc: "ตารางเช้า กลางวัน เย็น และก่อนนอน" },
  { href: "/appointments", icon: "นัด", title: "นัดหมอ", desc: "นัดถัดไปและสิ่งที่ต้องเตรียม" },
  { href: "/guide", icon: "ดูแล", title: "คู่มือดูแลม้า", desc: "สิ่งที่ม้าทำได้ และวิธีช่วยให้สบายตัว" },
];

export default function MedsHome() {
  return (
    <div className="space-y-3 py-2">
      <h2 className="mb-2 text-2xl font-extrabold text-teal">รักษา</h2>
      {cards.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          className="flex items-center gap-4 rounded-2xl border border-line bg-card p-4"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-soft font-bold text-teal">
            {c.icon}
          </span>
          <span className="flex-1">
            <strong className="block">{c.title}</strong>
            <small className="text-muted-foreground">{c.desc}</small>
          </span>
          <b className="text-2xl text-muted-foreground">›</b>
        </Link>
      ))}
    </div>
  );
}
