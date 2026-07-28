"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";

type Item = {
  id: string;
  time: string;
  label: string;
  text: string;
  trend: { text: string; up: boolean } | null;
  dotClass: string;
};
type DayGroup = { key: string; label: string; level: number; badge: string; cls: string; items: Item[] };
type Aeh = { id: string; icon: string; text: string; category: string; risk: { label: string; cls: string } };

// "บันทึกของผู้รับการดูแล" (prototype screen 15): 7-day-by-day timeline + AI "เอ๊ะ" analysis.
export function RecordsTabs({
  days,
  aeh,
  score,
  level,
  defaultView,
  allRange = false,
}: {
  days: DayGroup[];
  aeh: Aeh[];
  score: { badge: string; label: string; cls: string };
  level: number;
  defaultView: "all" | "signal";
  /** true = กำลังดูประวัติทั้งหมด (?range=all), false = 7 วันล่าสุด */
  allRange?: boolean;
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
          <p className="lead">
            {allRange
              ? "บันทึกทั้งหมดที่ผ่านมา แยกตามวัน · สีของแต่ละวันมาจากอาการที่ควรใส่ใจที่สุดของวันนั้น"
              : "บันทึก 7 วันย้อนหลัง แยกตามวัน · สีของแต่ละวันมาจากอาการที่ควรใส่ใจที่สุดของวันนั้น"}
          </p>
          {allRange && days.length === 0 && (
            <p className="rounded-[18px] border border-dashed border-line p-6 text-center text-muted-foreground">
              ยังไม่มีบันทึกเลยค่ะ
            </p>
          )}
          <div className="day-groups">
            {days.map((d) => (
              <section key={d.key} className={`day-card ${d.cls}`}>
                <header className="day-card-head">
                  <strong>{d.label}</strong>
                  {d.level > 0 && <span className="day-badge">{d.badge}</span>}
                </header>
                {d.items.length === 0 ? (
                  <p className="day-empty">ไม่มีบันทึกวันนี้</p>
                ) : (
                  <div className="timeline">
                    {d.items.map((e) => (
                      <article key={e.id}>
                        <time>{e.time}</time>
                        <span className={`dot ${e.dotClass}`} aria-hidden />
                        <div>
                          <small>{e.label}</small>
                          <strong>
                            {e.text}
                            {e.trend && (
                              <b className={`ml-1 inline-flex items-center gap-0.5 ${e.trend.up ? "text-[#2f9e44]" : "text-red"}`}>
                                {e.trend.up ? (
                                  <TrendingUp aria-hidden className="size-[1em] shrink-0" />
                                ) : (
                                  <TrendingDown aria-hidden className="size-[1em] shrink-0" />
                                )}
                                {e.trend.text}
                              </b>
                            )}
                          </strong>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
          {/* สลับช่วงเวลาได้สองทาง — เป็น Link เพราะช่วงเวลาตัดสินที่ฝั่งเซิร์ฟเวอร์ (?range=) */}
          <Link
            href={allRange ? "/signals" : "/signals?range=all"}
            className="btn-outline grid place-items-center"
          >
            {allRange ? "ดูเฉพาะ 7 วันล่าสุด" : "ดูบันทึกทั้งหมด"}
          </Link>
          <Link href="/summary" className="btn-primary grid place-items-center">สรุปให้หมอ</Link>
        </>
      ) : (
        <>
          <p className="lead">AI ช่วยดูบันทึก 7 วัน แล้วชี้เรื่องที่ควรใส่ใจให้ค่ะ</p>
          <div className={`doctor-score ${score.cls}`} style={{ cursor: "default" }}>
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
            เป็นการชวนสังเกต ไม่ใช่การวินิจฉัยโรค · จุดสียิ่งแดงยิ่งควรใส่ใจ
          </p>

          <div className="section-heading"><h3>เหตุการณ์ที่ต้องใส่ใจ</h3></div>
          {aeh.length === 0 ? (
            <p className="rounded-[18px] border border-dashed border-line p-6 text-center text-muted-foreground">
              ยังไม่มีสัญญาณที่ต้องใส่ใจ — เล่าเรื่องผู้รับการดูแลเพิ่มได้ที่หน้าบันทึกค่ะ
            </p>
          ) : (
            <div className="space-y-3">
              {aeh.map((a) => (
                <article key={a.id} className="aeh-card">
                  <div className="aeh-head">
                    <span>{a.icon}</span>
                    <div>
                      <strong>{a.text}</strong>
                      <small>{a.category}</small>
                    </div>
                    <b className={`risk ${a.risk.cls}`}>{a.risk.label}</b>
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="text-[16px] leading-relaxed text-muted-foreground">
            ระบบเทียบจากบันทึกของผู้รับการดูแลเอง และยังไม่ได้บอกว่าเป็นโรคอะไร
          </p>
          <Link href="/summary" className="btn-primary grid place-items-center">สรุปให้หมอ</Link>
        </>
      )}
    </div>
  );
}
