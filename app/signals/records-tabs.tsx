"use client";

import { useState } from "react";
import Link from "next/link";
import { HealthSignals } from "@/components/health-signals";

type Item = { id: string; time: string; label: string; text: string; dotClass: string };

// "บันทึกของม้า" (prototype screen 15): two sub-tabs — the event timeline and the AI analysis.
export function RecordsTabs({
  timeline,
  score,
  level,
  defaultView,
}: {
  timeline: Item[];
  score: { badge: string; label: string };
  level: number;
  defaultView: "all" | "signal";
}) {
  const [view, setView] = useState<"all" | "signal">(defaultView);

  return (
    <div className="space-y-4">
      <div className="seg-tabs cols-2" role="tablist">
        <button type="button" role="tab" aria-selected={view === "all"} onClick={() => setView("all")}>
          สรุปเหตุการณ์
        </button>
        <button type="button" role="tab" aria-selected={view === "signal"} onClick={() => setView("signal")}>
          ผลวิเคราะห์ · เอ๊ะ
        </button>
      </div>

      {view === "all" ? (
        <>
          <p className="lead">ทุกเรื่องที่ครอบครัวช่วยกันจดไว้ เรียงตามเวลา</p>
          {timeline.length === 0 ? (
            <p className="rounded-[18px] border border-dashed border-line p-6 text-center text-muted-foreground">
              ยังไม่มีบันทึก
            </p>
          ) : (
            <div className="timeline">
              {timeline.map((e) => (
                <article key={e.id}>
                  <time>{e.time}</time>
                  <span className={`dot ${e.dotClass}`} aria-hidden />
                  <div>
                    <small>{e.label}</small>
                    <strong>{e.text}</strong>
                  </div>
                </article>
              ))}
            </div>
          )}
          <Link href="/summary" className="btn-primary grid place-items-center">สรุปให้หมอ</Link>
        </>
      ) : (
        <>
          <p className="lead">AI ช่วยดูบันทึก 7 วัน แล้วชี้เรื่องที่ควรใส่ใจให้ค่ะ</p>
          <div className="doctor-score" style={{ cursor: "default" }}>
            <div className="score-top">
              <small>ผลวิเคราะห์จาก AI · จากบันทึก 7 วัน</small>
              <span className="score-badge">{score.badge}</span>
            </div>
            <div className="score-meter" aria-hidden>
              <i className={level >= 1 ? "filled" : ""} />
              <i className={level >= 2 ? "filled" : ""} />
              <i className={level >= 3 ? "filled" : ""} />
            </div>
            <strong>{score.label}</strong>
          </div>
          <p className="rounded-[14px] bg-amber-soft px-4 py-3 text-[16px] leading-relaxed text-[#5D4A23]">
            <b className="font-extrabold">“เอ๊ะ”</b> คือเหตุการณ์ที่ AI สังเกตว่าอาจนำไปสู่อาการที่ควรใส่ใจ
            เป็นการชวนสังเกต ไม่ใช่การวินิจฉัยโรค
          </p>
          <div className="section-heading"><h3>เหตุการณ์ที่ต้องใส่ใจ</h3></div>
          <HealthSignals />
          <Link href="/summary" className="btn-primary grid place-items-center">สรุปให้หมอ</Link>
        </>
      )}
    </div>
  );
}
