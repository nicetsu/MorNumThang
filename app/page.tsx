// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getActivePatient, PID_COOKIE } from "@/lib/patient";
import { dotClass, LEVEL } from "@/lib/severity";
import { recentSeverityLevel, news2Level, observationEscalationLevel, weightTrendLevel, persistentSoftSignLevel, type Vitals } from "@/lib/risk";
import { RightsSuggestion } from "@/components/rights-suggestion";

// Vitals from the latest WeightLog, but only if RECENT (≤48h) — stale vitals shouldn't
// drive today's doctor-score. Returns undefined otherwise so NEWS2 contributes nothing.
type VitalRow = { at: Date; systolic: number | null; pulse: number | null; temp: number | null; spo2: number | null };
// ไล่หาค่าล่าสุดของแต่ละ vital แยกกัน ในกรอบ 48h — record ที่จดแค่น้ำหนักจะไม่บังค่า vital เก่าที่ยังใหม่พอ
// (weights เรียง at desc มาแล้ว → .find ได้ค่าล่าสุดที่ไม่ null). ค่าที่ขาด → null; ครบ 48h ใหม่ล้วน → 0.
// ponytail: 48h เป็น calibration knob (จูน 24/72h ได้), ไม่ใช่เกณฑ์การแพทย์ตายตัว
function recentVitals(weights: VitalRow[]): Vitals {
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const fresh = weights.filter((w) => w.at.getTime() >= cutoff);
  const latest = (k: keyof Omit<VitalRow, "at">) => fresh.find((w) => w[k] != null)?.[k] ?? null;
  return { systolic: latest("systolic"), pulse: latest("pulse"), temp: latest("temp"), spo2: latest("spo2") };
}

function fmt(at: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(at);
}

export default async function Home() {
  // First visit (no ผู้รับการดูแล chosen) → force the selection screen.
  if (!(await cookies()).get(PID_COOKIE)) redirect("/patients");

  const patient = await getActivePatient();
  if (!patient) {
    return <p className="py-8 text-muted-foreground">ยังไม่มีข้อมูลผู้รับการดูแลค่ะ</p>;
  }

  const [weights, obs, nextMed, nextAppt] = await Promise.all([
    db.weightLog.findMany({ where: { patientId: patient.id }, orderBy: { at: "desc" }, take: 20 }),
    db.observation.findMany({ where: { patientId: patient.id }, orderBy: { at: "desc" }, take: 30 }),
    db.medication.findFirst({ where: { patientId: patient.id }, orderBy: { name: "asc" } }),
    db.appointment.findFirst({
      where: { patientId: patient.id, done: false, at: { gte: new Date(new Date().toDateString()) } },
      orderBy: { at: "asc" },
    }),
  ]);

  // Doctor-score = max( อาการที่จด(worst-recent) , NEWS2 vitals≤48h , escalation red-flag/soft-sign(48h) ,
  // weight-trend , persistence ) — bias to caution; ทุกตัวยกได้อย่างเดียว ไม่ลด (lib/risk.ts).
  const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
  const obsEscalation = obs
    .filter((o) => o.at.getTime() >= twoDaysAgo)
    .reduce((m, o) => Math.max(m, observationEscalationLevel(o.text, patient.age, o.signs?.split("·").map((s) => s.trim()).filter(Boolean) ?? [])), 0);
  // Doctor-score = max( อาการที่จด(worst-recent severity) , NEWS2 vitals≤48h , escalation red-flag/soft-sign(48h) ,
  // weight-trend , persistence ) — bias to caution; ทุกตัวยกได้อย่างเดียว ไม่ลด (lib/risk.ts).
  const level = Math.max(
    recentSeverityLevel(obs), // อาการที่จด — worst-recent (ตาข่ายกันเหตุนอกคลังคำ เช่น แผลไฟไหม้)
    news2Level(recentVitals(weights)),
    obsEscalation,
    weightTrendLevel(weights), // W3: น้ำหนักลด ≥5% ใน ~30 วัน → ควรสังเกต
    persistentSoftSignLevel(obs, patient.age), // soft sign เรื้อรัง ≥3/7 วัน → ควรปรึกษาหมอ
  ) as 0 | 1 | 2 | 3;
  const score = LEVEL[level];

  // Weight rows: trend arrow colored — ลดลง=แดง (น่าห่วง), เพิ่มขึ้น=เขียว.
  const weightItems = weights.map((w, i) => {
    const prev = weights[i + 1];
    let trend: { text: string; up: boolean } | null = null;
    if (prev) {
      const d = w.kg - prev.kg;
      if (Math.abs(d) >= 0.1) trend = { text: `${Math.abs(d).toFixed(1)} กก.`, up: d > 0 };
    }
    return { id: w.id, at: w.at, label: "น้ำหนัก", text: `${w.kg} กก.`, trend, dotClass: "teal" as string };
  });
  // Good news → clay dot + "วันนี้ดี"; concerns → severity-colored dot + "เอ๊ะ ·" prefix.
  const obsItems = obs.map((o) =>
    o.category === "เรื่องดี"
      ? { id: o.id, at: o.at, label: "วันนี้ดี", text: o.text, trend: null, dotClass: "green" }
      : { id: o.id, at: o.at, label: `เอ๊ะ · ${o.category}`, text: o.text, trend: null, dotClass: dotClass(o.severity) },
  );
  const timeline = [...weightItems, ...obsItems]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="screen-title">{patient.name}</h2>
        <Link href="/patients" className="shrink-0 text-sm font-bold text-teal">เปลี่ยนผู้รับการดูแล</Link>
      </div>

      <Link href="/signals?view=signal" className={`doctor-score block ${score.cls}`}>
        <div className="score-top">
          <small>จากบันทึก 7 วันนี้ของผู้รับการดูแล</small>
          <span className="score-badge">{score.badge}</span>
        </div>
        <div className="score-meter" aria-hidden>
          <i className={level >= 1 ? "filled" : ""} />
          <i className={level >= 2 ? "filled" : ""} />
          <i className={level >= 3 ? "filled" : ""} />
        </div>
        <strong>{score.label}</strong>
        <em>แตะเพื่อดูผลวิเคราะห์จาก AI <ArrowRight aria-hidden className="ml-1 inline size-[1em]" /></em>
      </Link>

      {/* Inline สิทธิ hint — AI phrases it for the current อาการ; direction decided in code. */}
      <RightsSuggestion />

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

      <Link
        href="/calendar"
        className="flex items-center justify-between rounded-[18px] bg-teal px-5 py-4 font-bold text-white"
      >
        <span>วันนี้ต้องทำอะไรบ้าง</span>
        <ArrowRight aria-hidden className="size-[1em]" />
      </Link>

      <section>
        <div className="section-heading">
          <h3>บันทึกล่าสุด</h3>
          <Link href="/logs" className="!text-clay inline-flex items-center gap-1"><Plus aria-hidden className="size-[1em]" />บันทึก</Link>
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
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
