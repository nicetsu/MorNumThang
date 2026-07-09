// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";

function fmt(at: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(at);
}

// ponytail: single-patient v1 — first patient is "ม้า". Multi-patient when real (PLAN §6).
export default async function Home() {
  const patient = await db.patient.findFirst();
  if (!patient) {
    return <p className="py-8 text-muted-foreground">ยังไม่มีข้อมูลม้าค่ะ</p>;
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [weights, obs, concernCount, nextMed, nextAppt] = await Promise.all([
    db.weightLog.findMany({ where: { patientId: patient.id }, orderBy: { at: "desc" }, take: 5 }),
    db.observation.findMany({ where: { patientId: patient.id }, orderBy: { at: "desc" }, take: 5 }),
    // Deterministic concern count for the score meter (LLM never gates this) — recent
    // observations in the last 7 days that aren't the "good news" category.
    db.observation.count({
      where: { patientId: patient.id, at: { gte: weekAgo }, category: { not: "เรื่องดี" } },
    }),
    db.medication.findFirst({ where: { patientId: patient.id }, orderBy: { name: "asc" } }),
    db.appointment.findFirst({
      where: { patientId: patient.id, done: false, at: { gte: new Date(new Date().toDateString()) } },
      orderBy: { at: "asc" },
    }),
  ]);

  // Score level 1–3 from concern count (deterministic heuristic, a "ชวนสังเกต" prompt).
  const level = concernCount === 0 ? 1 : concernCount <= 2 ? 2 : 3;
  const score = {
    1: { badge: "ดูแลได้ดี", label: "ระดับ 1 จาก 3 — สบายดี" },
    2: { badge: "ควรสังเกต", label: "ระดับ 2 จาก 3 — ปานกลาง" },
    3: { badge: "ควรปรึกษาหมอ", label: "ระดับ 3 จาก 3 — ควรใส่ใจ" },
  }[level];

  // Weight rows show a trend arrow vs the previous entry (like the prototype).
  const weightItems = weights.map((w, i) => {
    const prev = weights[i + 1];
    let trend = "";
    if (prev) {
      const d = w.kg - prev.kg;
      if (Math.abs(d) >= 0.1) trend = ` ${d < 0 ? "↘" : "↗"} ${Math.abs(d).toFixed(1)} กก.`;
    }
    return { id: w.id, at: w.at, label: "น้ำหนัก", text: `${w.kg} กก.${trend}`, dotClass: "" };
  });
  // Good news → clay dot + "วันนี้ดี"; concerns → amber dot + "เอ๊ะ ·" prefix.
  const obsItems = obs.map((o) =>
    o.category === "เรื่องดี"
      ? { id: o.id, at: o.at, label: "วันนี้ดี", text: o.text, dotClass: "clay" }
      : { id: o.id, at: o.at, label: `เอ๊ะ · ${o.category}`, text: o.text, dotClass: "amber" },
  );
  const timeline = [...weightItems, ...obsItems]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <h2 className="screen-title">{patient.name}</h2>

      <Link href="/signals?view=signal" className="doctor-score block">
        <div className="score-top">
          <small>จากบันทึก 7 วันนี้ของม้า</small>
          <span className="score-badge">{score.badge}</span>
        </div>
        <div className="score-meter" aria-hidden>
          <i className={level >= 1 ? "filled" : ""} />
          <i className={level >= 2 ? "filled" : ""} />
          <i className={level >= 3 ? "filled" : ""} />
        </div>
        <strong>{score.label}</strong>
        <em>แตะเพื่อดูผลวิเคราะห์จาก AI →</em>
      </Link>

      {/* Reminder cards: next med + next appointment — always both, like the prototype. */}
      <div className="reminder-cards">
        <Link href="/meds/list" className="reminder-card">
          <small>ยาช่วงถัดไป</small>
          {nextMed ? (
            <>
              <strong>{nextMed.name}{nextMed.dose ? ` · ${nextMed.dose} เม็ด` : ""}</strong>
              <span>{nextMed.whenTime ?? "แตะเพื่อดูตารางยา"}</span>
            </>
          ) : (
            <>
              <strong>ยังไม่มียา</strong>
              <span>แตะเพื่อเพิ่มยา</span>
            </>
          )}
        </Link>
        <Link href="/appointments" className="reminder-card appt">
          <small>นัดที่จะถึง</small>
          {nextAppt ? (
            <>
              <strong>{nextAppt.note ?? "นัดหมอ"}</strong>
              <span>{fmt(nextAppt.at)}</span>
            </>
          ) : (
            <>
              <strong>ยังไม่มีนัด</strong>
              <span>แตะเพื่อเพิ่มนัด</span>
            </>
          )}
        </Link>
      </div>

      <section>
        <div className="section-heading">
          <h3>บันทึกล่าสุด</h3>
          <Link href="/logs" className="!text-clay">+ บันทึก</Link>
        </div>
        {timeline.length === 0 ? (
          <p className="rounded-[18px] border border-dashed border-line p-6 text-center text-muted-foreground">
            ยังไม่มีบันทึก แตะ “+ บันทึก” เพื่อเริ่มค่ะ
          </p>
        ) : (
          <div className="timeline">
            {timeline.map((e) => (
              <Link key={e.id} href="/signals">
                <article>
                  <time>{fmt(e.at)}</time>
                  <span className={`dot ${e.dotClass}`} aria-hidden />
                  <div>
                    <small>{e.label}</small>
                    <strong>{e.text}</strong>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
