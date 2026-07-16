// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getActivePatient } from "@/lib/patient";
import { dotClass, scoreLevel, LEVEL } from "@/lib/severity";
import { recentSeverityLevel, news2Level, observationEscalationLevel, weightTrendLevel, persistentSoftSignLevel, type Vitals } from "@/lib/risk";
import { RecordsTabs } from "./records-tabs";
import { BackLink } from "@/components/back-link";

// Latest WeightLog vitals, only if ≤48h old (else stale — don't drive today's score).
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

// Grouped by day now, so the row only needs the time — the date lives on the day header.
function hm(at: Date) {
  return new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" }).format(at);
}

// Short icon per category for the aeh-cards.
function iconOf(cat: string): string {
  if (cat.includes("กิน")) return "กิน";
  if (cat.includes("นอน")) return "นอน";
  if (cat.includes("เดิน")) return "เดิน";
  if (cat.includes("ยา")) return "ยา";
  if (cat.includes("อารมณ์")) return "ใจ";
  return "เอ๊ะ";
}

export default async function Records({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const patient = await getActivePatient();
  if (!patient) {
    return <p className="py-8 text-muted-foreground">ยังไม่มีข้อมูลผู้รับการดูแลค่ะ</p>;
  }

  const { view } = await searchParams;

  const [weights, obs] = await Promise.all([
    db.weightLog.findMany({ where: { patientId: patient.id }, orderBy: { at: "desc" } }),
    db.observation.findMany({ where: { patientId: patient.id }, orderBy: { at: "desc" } }),
  ]);

  // Doctor-score = max( อาการที่จด(worst-recent) , NEWS2 vitals ≤48h , escalation red-flag/soft-sign 48h ,
  // weight-trend , persistence ) — bias to caution; ทุกตัวยกได้อย่างเดียว ไม่ลด.
  const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
  const obsEscalation = obs
    .filter((o) => o.at.getTime() >= twoDaysAgo)
    .reduce((m, o) => Math.max(m, observationEscalationLevel(o.text, patient.age, o.signs?.split("·").map((s) => s.trim()).filter(Boolean) ?? [])), 0);
  // doctor-score = max( อาการที่จด(worst-recent severity) , NEWS2 vitals ≤48h , escalation red-flag/soft-sign 48h ,
  // weight-trend , persistence ) — bias to caution; ทุกตัวยกได้อย่างเดียว ไม่ลด.
  const level = Math.max(
    recentSeverityLevel(obs), // อาการที่จด — worst-recent (ตาข่ายกันเหตุนอกคลังคำ เช่น แผลไฟไหม้)
    news2Level(recentVitals(weights)),
    obsEscalation,
    weightTrendLevel(weights), // W3: น้ำหนักลด ≥5% ใน ~30 วัน → ควรสังเกต
    persistentSoftSignLevel(obs, patient.age), // soft sign เรื้อรัง ≥3/7 วัน → ควรปรึกษาหมอ
  ) as 0 | 1 | 2 | 3;
  const score = LEVEL[level];

  const weightItems = weights.map((w, i) => {
    const prev = weights[i + 1];
    let trend: { text: string; up: boolean } | null = null;
    if (prev) {
      const d = w.kg - prev.kg;
      if (Math.abs(d) >= 0.1) trend = { text: `${Math.abs(d).toFixed(1)} กก.`, up: d > 0 };
    }
    return { id: w.id, at: w.at, time: hm(w.at), label: "น้ำหนัก", text: `${w.kg} กก.`, trend, dotClass: "teal" };
  });
  const obsItems = obs.map((o) =>
    o.category === "เรื่องดี"
      ? { id: o.id, at: o.at, time: hm(o.at), label: "วันนี้ดี", text: o.text, trend: null, dotClass: "green" }
      : { id: o.id, at: o.at, time: hm(o.at), label: `เอ๊ะ · ${o.category}`, text: o.text, trend: null, dotClass: dotClass(o.severity) },
  );

  // แยกบันทึกตามวัน 7 วันย้อนหลัง (วันนี้บนสุด). สีของแต่ละวัน = floor ระดับอาการของวันนั้น
  // (lib/severity.scoreLevel) — 1 เขียว, 2 เหลือง, 3 ส้ม; 0 = ยังไม่มีอาการบันทึกไว้.
  const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const todayStart = dayStart(new Date());
  const days = Array.from({ length: 7 }, (_, i) => {
    const key = todayStart - i * 86_400_000;
    return {
      key,
      label: new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", month: "short" }).format(new Date(key)),
      severities: [] as (number | null)[],
      items: [] as (typeof weightItems)[number][],
    };
  });
  const byDay = new Map(days.map((d) => [d.key, d]));
  for (const o of obs) byDay.get(dayStart(o.at))?.severities.push(o.severity);
  for (const it of [...weightItems, ...obsItems]) byDay.get(dayStart(it.at))?.items.push(it);
  const dayGroups = days.map((d) => {
    const level = scoreLevel(d.severities);
    return {
      key: String(d.key),
      label: d.label,
      level,
      badge: LEVEL[level].badge,
      cls: LEVEL[level].cls,
      items: d.items.sort((a, b) => b.at.getTime() - a.at.getTime()).map(({ at: _at, ...rest }) => rest),
    };
  });

  // aeh-cards: concern observations, most severe first.
  const risk = (s: number | null) => {
    const v = s ?? 5;
    return v >= 8
      ? { label: "เอ๊ะ", cls: "high" }
      : v >= 4
        ? { label: "เฝ้าดู", cls: "mid" }
        : { label: "ปกติ", cls: "low" };
  };
  const aeh = obs
    .filter((o) => o.category !== "เรื่องดี")
    .sort((a, b) => (b.severity ?? 5) - (a.severity ?? 5))
    .slice(0, 6)
    .map((o) => ({ id: o.id, icon: iconOf(o.category), text: o.text, category: o.category, risk: risk(o.severity) }));

  return (
    <div className="space-y-4">
      <BackLink fallback="/">กลับ</BackLink>
      <div>
        <p className="eyebrow">ประวัติการดูแลผู้รับการดูแล</p>
        <h2 className="screen-title">บันทึกของผู้รับการดูแล</h2>
      </div>
      <RecordsTabs
        days={dayGroups}
        aeh={aeh}
        score={score}
        level={level}
        defaultView={view === "signal" ? "signal" : "all"}
      />
    </div>
  );
}
