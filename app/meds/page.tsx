import Link from "next/link";

const cards = [
  { href: "/meds/list", icon: "ยา", title: "ยาที่ต้องทาน", desc: "ตารางเช้า กลางวัน เย็น และก่อนนอน" },
  { href: "/appointments", icon: "นัด", title: "นัดหมอ", desc: "นัดถัดไปและสิ่งที่ต้องเตรียม" },
  { href: "/guide", icon: "ดูแล", title: "คู่มือดูแลม้า", desc: "สิ่งที่ม้าทำได้ และวิธีช่วยให้สบายตัว" },
];

export default function MedsHome() {
  return (
    <div className="space-y-3">
      <h2 className="screen-title">รักษา</h2>
      <div className="grid gap-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="nav-card">
            <span className="nav-card-icon">{c.icon}</span>
            <span className="nav-card-body">
              <strong>{c.title}</strong>
              <small>{c.desc}</small>
            </span>
            <b className="nav-card-arrow">›</b>
          </Link>
        ))}
      </div>
    </div>
  );
}
