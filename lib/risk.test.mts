import assert from "node:assert";
import {
  news2Score, symptomBand, geriatricBand, assessRisk, news2Level,
  containsSign, observationBand, observationEscalationLevel, weightTrendLevel,
  persistentSoftSignLevel, recentSeverityLevel, statedSigns,
} from "./risk.ts";
import { scoreLevel } from "./severity.ts";

const NOW = new Date("2026-07-16T00:00:00Z").getTime();
const DAY = 86400000;

// ───── NEWS2 ─────
// single parameter = 3 → แดง (safety net)
assert.equal(news2Score({ systolic: 88 }).band, 2); // sys ≤90 = 3
assert.equal(news2Score({ systolic: 88 }).anyThree, true);
assert.equal(news2Score({ pulse: 135 }).band, 2); // ≥131 = 3
assert.equal(news2Score({ spo2: 90 }).band, 2); // ≤91 = 3
// mild หลายตัวรวม → เฝ้าดู (ไม่ใช่แดง)
{
  const r = news2Score({ systolic: 105, pulse: 95, temp: 38.3 }); // 1+1+1
  assert.equal(r.total, 3);
  assert.equal(r.anyThree, false);
  assert.equal(r.band, 1);
}
// ≥7 → ด่วนมาก
assert.equal(news2Score({ spo2: 90, pulse: 135, temp: 39.5 }).band, 3); // 3+3+2
// ปกติ → 0 · ไม่มี vital → 0 + incomplete
assert.equal(news2Score({ systolic: 120, pulse: 70, temp: 37 }).band, 0);
assert.equal(news2Score({}).incomplete, true);
assert.equal(news2Score({ systolic: 120 }).missing.length, 6); // วัดตัวเดียว → ขาด 6

// ───── Symptom (2-class) ─────
assert.equal(symptomBand("A", false), 2); // Class A แดงเอง
assert.equal(symptomBand("A", false, true), 3); // A + critical → ด่วน
assert.equal(symptomBand("B", false), 1); // ปวดท้องเดี่ยวๆ = เฝ้าดู (แก้ over-triage)
assert.equal(symptomBand("B", true), 2); // + danger sign → แดง
assert.equal(symptomBand("B", true, true), 3);

// ───── Geriatric soft signs (I3) ─────
assert.equal(geriatricBand(82, ["ไม่กินข้าว", "ซึม", "ไม่เหมือนเดิม"]), 2); // มี delirium(ซึม) → แดง (เคส #14 เดิม under-triage)
assert.equal(geriatricBand(80, ["สับสน"]), 2); // delirium เดี่ยว → แดง
assert.equal(geriatricBand(80, ["ไม่กินข้าว", "ล้ม"]), 2); // 2 soft → แดง
assert.equal(geriatricBand(78, ["ล้ม", "เดินเซ"]), 2);
assert.equal(geriatricBand(80, ["กินน้อยลง"]), 1); // soft เดี่ยว-เบา → เฝ้าดู (ไม่ over-triage)
assert.equal(geriatricBand(80, ["กินน้อยลง"], true), 2); // + เฉียบพลัน → แดง
assert.equal(geriatricBand(60, ["กินน้อยลง"]), 0); // ไม่ใช่ผู้สูงอายุ → ไม่ยิง

// ───── รวม (assessRisk = max) — ตามตารางในเอกสาร ─────
// ปวดท้องเล็กน้อย vital ปกติ อายุ 60 → เฝ้าดู
assert.equal(assessRisk({
  vitals: { systolic: 120, pulse: 72, temp: 37 },
  symptom: { cls: "B", dangerSignPresent: false }, age: 60,
}).band, 1);
// ปวดท้อง + อาเจียนเป็นเลือด → แดง
assert.equal(assessRisk({ symptom: { cls: "B", dangerSignPresent: true }, age: 60 }).band, 2);
// ปวดท้อง + ไข้39 + ชีพจร120 → แดง (danger sign ไข้สูง)
assert.equal(assessRisk({
  vitals: { temp: 39.0, pulse: 120 }, symptom: { cls: "B", dangerSignPresent: true }, age: 65,
}).band, 2);
// เจ็บหน้าอก (Class A) → แดง
assert.equal(assessRisk({ symptom: { cls: "A", dangerSignPresent: false }, age: 65 }).band, 2);
// ความดัน 88 เดี่ยว → แดง (NEWS2)
assert.equal(assessRisk({ vitals: { systolic: 88 }, age: 60 }).band, 2);
// 82 ปี · ไม่กินข้าว+ซึม+ไม่เหมือนเดิม (ไม่มี vital/danger sign) → แดง + incomplete
{
  const r = assessRisk({ age: 82, softSigns: ["ไม่กินข้าว", "ซึม", "ไม่เหมือนเดิม"] });
  assert.equal(r.band, 2);
  assert.equal(r.incomplete, true);
}
// 80 ปี · กินน้อยลงนิดหน่อย → เฝ้าดู (ไม่ over-triage)
assert.equal(assessRisk({ age: 80, softSigns: ["กินน้อยลง"] }).band, 1);

// ───── W1 extraction (keyword net + negation guard) ─────
assert.equal(containsSign("วันนี้อาเจียนเป็นเลือด", "อาเจียนเป็นเลือด"), true);
assert.equal(containsSign("ไม่มีอาเจียนเป็นเลือด", "อาเจียนเป็นเลือด"), false); // negation guard
assert.equal(containsSign("ปวดท้องนิดหน่อย", "อาเจียนเป็นเลือด"), false);
// observationBand — escalate เฉพาะเมื่อเจอ trigger
assert.equal(observationBand("ปวดท้องนิดหน่อย", 60), 0); // Class B เดี่ยว → ไม่ยกระดับ
assert.equal(observationBand("ปวดท้อง อาเจียนเป็นเลือด", 60), 2); // B + danger → แดง
assert.equal(observationBand("เจ็บหน้าอก", 60), 2); // Class A → แดงเอง
assert.equal(observationBand("หมดสติ", 60), 3); // critical → ด่วน
// อุบัติเหตุ/บาดเจ็บ = Class A (เข้าคลังคำแล้ว ไม่ต้องพึ่ง severity ของ LLM)
assert.equal(observationBand("แม่โดนน้ำร้อนลวกทั้งแขน", 65), 2); // แผลไฟไหม้/ลวก → ควรปรึกษาหมอ
assert.equal(observationBand("ไฟไหม้ระยะ 3", 65), 2); // แผลไฟไหม้ระดับ 3 → ควรปรึกษาหมอ
assert.equal(observationBand("แม่สำลักอาหารตอนกินข้าว", 65), 2); // สำลัก/ติดคอ → ควรปรึกษาหมอ
assert.equal(observationBand("มีเลือดออกไม่หยุดจากแผล", 65), 3); // เลือดออกไม่หยุด → critical/ด่วน
assert.equal(observationBand("ม้าซึมลง ไม่กินข้าว", 82), 2); // ผู้สูงอายุ + delirium → แดง
assert.equal(observationBand("วันนี้กินน้อยลงนิดหน่อย", 80), 1); // soft เดี่ยว-เบา → เฝ้าดู
assert.equal(observationBand("วันนี้กินน้อยลง", 60), 0); // ไม่ใช่ผู้สูงอายุ → ไม่ยิง
assert.equal(observationEscalationLevel("ปวดท้อง อาเจียนเป็นเลือด", 60), 3);
assert.equal(observationEscalationLevel("วันนี้กินน้อยลงนิดหน่อย", 80), 2);
assert.equal(observationEscalationLevel("ปวดท้องนิดหน่อย", 60), 0);

// ───── recentSeverityLevel: worst-recent (ตาข่ายกันเหตุนอกคลังคำ เช่น แผลไฟไหม้) ─────
const sev = (s: number | null, d: number) => ({ severity: s, at: new Date(NOW - d * DAY) });
// แผลไฟไหม้ระดับ 3 — ไม่มีใน Class A/B/soft sign → เข้า score ทาง severity เท่านั้น → ต้องเด้ง 3
assert.equal(recentSeverityLevel([sev(10, 0)], NOW), 3);
// ปัญหาเดิม: เฉลี่ย [1,1,1,1,9] เจือจางเหลือ ~เหลือง; worst-recent = แดง
assert.equal(recentSeverityLevel([sev(1, 0), sev(1, 0), sev(1, 1), sev(1, 2), sev(9, 0)], NOW), 3);
assert.equal(recentSeverityLevel([sev(9, 1)], NOW), 3); // จดครั้งเดียวก็แดง (frequency-independent)
assert.equal(recentSeverityLevel([sev(6, 5), sev(2, 6)], NOW), 0); // เหลือง/เขียวเก่า (4–7 วัน) จางหาย
assert.equal(recentSeverityLevel([sev(9, 5)], NOW), 3); // "แดงเก่า" ยังค้าง
assert.equal(recentSeverityLevel([sev(9, 9)], NOW), 0); // เกิน 7 วัน → ไม่นับ
assert.equal(recentSeverityLevel([sev(null, 0)], NOW), 2); // null = band 2 เมื่อ recent
assert.equal(recentSeverityLevel([], NOW), 0); // ไม่มีอาการ → 0

// ───── statedSigns — drop LLM signs not literally in the caregiver's text (anti-hallucination) ─────
assert.deepEqual(statedSigns("ม้าหอบเหนื่อย นอนราบไม่ได้", ["หอบ", "นอนราบไม่ได้"]), ["หอบ", "นอนราบไม่ได้"]); // legit → เก็บ
assert.deepEqual(statedSigns("วันนี้รถติดมาก", ["ไม่รู้สึกตัว", "ไม่หายใจ", "ตัวเขียว"]), []); // ไม่มีในข้อความ → ตัดทิ้ง
// เมื่อ signs ที่โมเดลแต่งถูกตัด ข้อความที่ไม่มี keyword จริงก็ไม่ escalate
assert.equal(observationBand("วันนี้รถติดมาก", 80, statedSigns("วันนี้รถติดมาก", ["ไม่หายใจ", "ตัวเขียว"])), 0);

// ───── wiring → doctor-score ─────
assert.equal(news2Level(undefined), 0); // ไม่มี vitals → ไม่ contribute
assert.equal(news2Level({}), 0); // วัดไม่มีเลย
assert.equal(news2Level({ systolic: 120, pulse: 70, temp: 37, spo2: 98 }), 1); // ปกติ → ดูแลได้ดี
assert.equal(news2Level({ spo2: 90 }), 3); // แดง → ควรปรึกษาหมอ
assert.equal(news2Level({ systolic: 105, pulse: 95, temp: 38.3 }), 2); // เฝ้าดู → ควรสังเกต
// combined = max(อาการ, NEWS2) — วิธีที่หน้าเพจใช้จริง
const combined = (sev: (number | null)[], v?: Parameters<typeof news2Level>[0]) =>
  Math.max(scoreLevel(sev), news2Level(v));
assert.equal(combined([2], { spo2: 90 }), 3); // อาการเบา(1) แต่ SpO2 ต่ำ → 3
assert.equal(combined([6, 6], undefined), 2); // อาการล้วน band 2
assert.equal(combined([], undefined), 0); // ไม่มีข้อมูลเลย
assert.equal(combined([1, 1], { temp: 37, systolic: 120 }), 1); // ทั้งคู่ดี → ดูแลได้ดี

// ───── W3 weight-loss trend ─────
assert.equal(weightTrendLevel([ // ลด 60→55 (8.3%) ใน 20 วัน → ควรสังเกต
  { kg: 55, at: new Date(NOW - 1 * DAY) }, { kg: 60, at: new Date(NOW - 20 * DAY) },
], NOW), 2);
assert.equal(weightTrendLevel([ // คงที่ → 0
  { kg: 60, at: new Date(NOW - 1 * DAY) }, { kg: 60.5, at: new Date(NOW - 15 * DAY) },
], NOW), 0);
assert.equal(weightTrendLevel([ // ค่าล่าสุดเก่าเกิน 7 วัน → 0
  { kg: 55, at: new Date(NOW - 10 * DAY) }, { kg: 60, at: new Date(NOW - 20 * DAY) },
], NOW), 0);
assert.equal(weightTrendLevel([{ kg: 55, at: new Date(NOW - DAY) }], NOW), 0); // <2 จุด

// ───── W4 eval seed — realistic Thai narratives (ให้แพทย์ review/ขยายภายหลัง) ─────
// [ข้อความเล่า, อายุ, escalation level ที่คาด] — ชุดตั้งต้นของ eval harness
const EVAL: [string, number, 0 | 2 | 3][] = [
  ["วันนี้ม้ากินน้อยลง", 78, 2], // soft เดี่ยว (ผู้สูงอายุ) → ควรสังเกต
  ["ม้าปวดท้องนิดหน่อย กินยาแล้วดีขึ้น", 78, 0], // ธรรมดา ไม่มี danger → ไม่ยกระดับ
  ["ม้าปวดท้องมาก อาเจียนออกมาเป็นเลือด", 78, 3], // B + danger sign(เป็นเลือด) → ควรปรึกษาหมอ
  ["เมื่อเช้าม้าเจ็บหน้าอก เหงื่อออกเยอะ", 65, 3], // Class A → ควรปรึกษาหมอ
  ["ม้าซึมลง เรียกไม่ค่อยรู้เรื่อง ไม่ยอมกินข้าว", 82, 3], // delirium (ผู้สูงอายุ) → แดง
  ["ม้าไม่มีอาการอะไร สบายดี กินได้ปกติ", 80, 0], // ปกติ (negation guard) → 0
  ["ลูกสาวมาเยี่ยม ม้าอารมณ์ดีมาก", 80, 0], // เรื่องดี → 0
];
for (const [text, age, expected] of EVAL) {
  assert.equal(observationEscalationLevel(text, age), expected, `EVAL: "${text}"`);
}

// KNOWN GAPS (keyword net พลาดเพราะการพิมพ์ต่างวลี → ต้อง LLM-union W1). Assert=พฤติกรรมจริงตอนนี้ (0)
// ไม่ใช่ค่าที่ถูกทางคลินิก — บันทึกไว้เป็นหลักฐานว่าทำไมต้องทำ W1 union ต่อ.
const KNOWN_GAPS: [string, number][] = [
  ["ม้ากินข้าวได้น้อยลงมากเลย", 80], // "กินข้าวได้น้อยลง" ≠ keyword "กินน้อยลง"
];
for (const [text, age] of KNOWN_GAPS) {
  assert.equal(observationEscalationLevel(text, age), 0, `KNOWN GAP: "${text}"`);
}
// W1 LLM-union ปิดช่องนี้: LLM แท็ก canonical "กินน้อยลง" ให้ → escalate ได้แม้ keyword net พลาดวลี
assert.equal(observationEscalationLevel("ม้ากินข้าวได้น้อยลงมากเลย", 80, ["กินน้อยลง"]), 2);
// LLM hallucinate tag ที่ไม่อยู่ใน CANONICAL จะถูกกรองทิ้งตั้งแต่ parse (ai.ts) — ที่นี่รับ tag ที่ผ่านแล้ว
assert.equal(observationEscalationLevel("ม้าปวดท้อง", 78, ["เป็นเลือด"]), 3); // LLM จับ "เลือด" ที่ keyword พลาด

// ───── W5 context guard (negation / hypothetical / resolved) ─────
assert.equal(containsSign("กลัวจะมีเลือด", "มีเลือด"), false); // hypothetical
assert.equal(containsSign("ปวดหัวหายแล้ว", "ปวดหัว"), false); // resolved (after)
assert.equal(containsSign("เจ็บหน้าอก หายใจไม่ออก", "เจ็บหน้าอก"), true); // "หายใจ" ต้องไม่ถูกนับเป็น "หาย(แล้ว)"
assert.equal(containsSign("งดน้ำงดอาหาร ไม่มีเลือด", "เลือด"), false); // negation
assert.equal(containsSign("วันนี้อาเจียนเป็นเลือด", "เป็นเลือด"), true);

// ───── persistence — soft sign เรื้อรัง (ผู้สูงอายุ) ─────
const softObs = (offsets: number[], signs: string | null = null) =>
  offsets.map((d) => ({ text: "ม้ากินน้อยลง", signs, at: new Date(NOW - d * DAY) }));
assert.equal(persistentSoftSignLevel(softObs([0, 1, 2]), 80, NOW), 3); // 3 วัน → ควรปรึกษาหมอ
assert.equal(persistentSoftSignLevel(softObs([0, 1]), 80, NOW), 0); // 2 วัน → ยัง (watch มาจาก obsEscalation)
assert.equal(persistentSoftSignLevel(softObs([0, 1, 2]), 60, NOW), 0); // ไม่ใช่ผู้สูงอายุ
// keyword net พลาดวลี แต่ LLM tag ให้ → persistence ยังจับได้ (union)
const gapObs = [0, 1, 2].map((d) => ({ text: "ม้ากินข้าวได้น้อยลง", signs: "กินน้อยลง", at: new Date(NOW - d * DAY) }));
assert.equal(persistentSoftSignLevel(gapObs, 80, NOW), 3);

// ───── regression: alias keys (คำที่ญาติพูดจริง ≠ ชื่ออาการทางการ) — จาก 16-case eval ─────
assert.equal(observationBand("ลื่นล้มในห้องน้ำ หัวฟาดพื้น", 82), 2); // "ล้ม" + "หัวกระแทก/หัวฟาด" → แดง
assert.equal(observationBand("ขาซ้ายบวมแดง ปวด กดเจ็บ", 75), 2); // "บวม" + "กดเจ็บ" (DVT) → แดง (เคยพลาดเป็นปกติ)
assert.equal(observationBand("ท้องเสียหลายรอบ ปากแห้ง อ่อนเพลีย", 79), 2); // "ท้องเสีย" + "ปากแห้ง" → แดง
assert.equal(observationBand("ตัวร้อน ไข้ขึ้นสูง หนาวสั่น", 80), 2); // "ตัวร้อน/ไข้" + "หนาวสั่น" → แดง
assert.equal(observationBand("ม้าปวดเข่าเรื้อรัง เดินได้ปกติ", 80), 0); // เรื้อรังคงที่ ไม่มี danger → ไม่ยกระดับ

console.log("risk.test: ok");
