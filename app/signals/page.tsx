// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { RecordsTabs } from "./records-tabs";

function fmt(at: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(at);
}

export default async function Records({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const patient = await db.patient.findFirst();
  if (!patient) {
    return <p className="py-8 text-muted-foreground">ยังไม่มีข้อมูลม้าค่ะ</p>;
  }

  const { view } = await searchParams;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [weights, obs, concernCount] = await Promise.all([
    db.weightLog.findMany({ where: { patientId: patient.id }, orderBy: { at: "desc" } }),
    db.observation.findMany({ where: { patientId: patient.id }, orderBy: { at: "desc" } }),
    db.observation.count({
      where: { patientId: patient.id, at: { gte: weekAgo }, category: { not: "เรื่องดี" } },
    }),
  ]);

  const level = concernCount === 0 ? 1 : concernCount <= 2 ? 2 : 3;
  const score = {
    1: { badge: "ดูแลได้ดี", label: "ระดับ 1 จาก 3 — สบายดี" },
    2: { badge: "ควรสังเกต", label: "ระดับ 2 จาก 3 — ปานกลาง" },
    3: { badge: "ควรปรึกษาหมอ", label: "ระดับ 3 จาก 3 — ควรใส่ใจ" },
  }[level];

  const weightItems = weights.map((w, i) => {
    const prev = weights[i + 1];
    let trend = "";
    if (prev) {
      const d = w.kg - prev.kg;
      if (Math.abs(d) >= 0.1) trend = ` ${d < 0 ? "↘" : "↗"} ${Math.abs(d).toFixed(1)} กก.`;
    }
    return { id: w.id, at: w.at, time: fmt(w.at), label: "น้ำหนัก", text: `${w.kg} กก.${trend}`, dotClass: "" };
  });
  const obsItems = obs.map((o) =>
    o.category === "เรื่องดี"
      ? { id: o.id, at: o.at, time: fmt(o.at), label: "วันนี้ดี", text: o.text, dotClass: "clay" }
      : { id: o.id, at: o.at, time: fmt(o.at), label: `เอ๊ะ · ${o.category}`, text: o.text, dotClass: "amber" },
  );
  const timeline = [...weightItems, ...obsItems]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .map(({ at: _at, ...rest }) => rest); // drop Date before passing to client

  return (
    <div className="space-y-4">
      <Link href="/" className="back-link">← สมุดของม้า</Link>
      <div>
        <p className="eyebrow">ประวัติการดูแลม้า</p>
        <h2 className="screen-title">บันทึกของม้า</h2>
      </div>
      <RecordsTabs
        timeline={timeline}
        score={score}
        level={level}
        defaultView={view === "signal" ? "signal" : "all"}
      />
    </div>
  );
}
