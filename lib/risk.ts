// Deterministic risk/urgency engine (AGENTS.md rule 2 — the LLM NEVER decides urgency here;
// it only extracts structured features that feed these pure functions). Design + evidence:
// docs/risk-score-plan.md. This module is the auditable core; LLM-extraction wiring and the
// vitals data-model changes (W2) are follow-ups — see the roadmap in that doc.
//
// Band scale: 0 เขียว(ปกติ) · 1 เฝ้าดู(เหลือง) · 2 ควรหาหมอ(แดง) · 3 ด่วนมาก(แดงเข้ม).
export type Band = 0 | 1 | 2 | 3;
export const BAND_LABEL: Record<Band, string> = {
  0: "ปกติ",
  1: "เฝ้าดู",
  2: "ควรปรึกษาหมอ",
  3: "ควรพบแพทย์ด่วน",
};

// ───────────────────────── Track 1: NEWS2 (vital signs) ─────────────────────────
// Standard NEWS2 point table (Royal College of Physicians). Only the params that were
// actually measured contribute; missing ones are reported, never assumed normal (R13).
export type Vitals = {
  respRate?: number | null; // /นาที
  spo2?: number | null; // % (scale 1)
  onOxygen?: boolean | null; // ได้ออกซิเจนเสริม
  temp?: number | null; // °C
  systolic?: number | null; // ความดันตัวบน mmHg
  pulse?: number | null; // ชีพจร /นาที
  consciousness?: "alert" | "altered" | null; // สับสนใหม่/ซึม/ไม่ตอบสนอง = altered
};

const band = (n: number): 0 | 1 | 2 | 3 => (n <= 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : 3);

// Each returns 0–3, or null when not measured.
function pResp(v?: number | null) {
  if (v == null) return null;
  if (v <= 8 || v >= 25) return 3;
  if (v >= 21) return 2;
  if (v <= 11) return 1;
  return 0; // 12–20
}
function pSpo2(v?: number | null) {
  if (v == null) return null;
  if (v <= 91) return 3;
  if (v <= 93) return 2;
  if (v <= 95) return 1;
  return 0; // ≥96
}
function pTemp(v?: number | null) {
  if (v == null) return null;
  if (v <= 35.0) return 3;
  if (v >= 39.1) return 2;
  if (v <= 36.0 || v >= 38.1) return 1;
  return 0; // 36.1–38.0
}
function pSystolic(v?: number | null) {
  if (v == null) return null;
  if (v <= 90 || v >= 220) return 3;
  if (v <= 100) return 2;
  if (v <= 110) return 1;
  return 0; // 111–219
}
function pPulse(v?: number | null) {
  if (v == null) return null;
  if (v <= 40 || v >= 131) return 3;
  if (v >= 111 || v <= 50) return 2;
  if (v >= 91) return 1; // 91–110
  return 0; // 51–90
}

export type News2Result = {
  total: number;
  params: Record<string, number>; // เฉพาะที่วัด
  missing: string[]; // พารามิเตอร์ที่ไม่ได้วัด
  anyThree: boolean; // มีพารามิเตอร์เดี่ยว = 3
  band: Band;
  incomplete: boolean;
};

export function news2Score(v: Vitals): News2Result {
  const entries: [string, number | null][] = [
    ["respRate", pResp(v.respRate)],
    ["spo2", pSpo2(v.spo2)],
    ["onOxygen", v.onOxygen == null ? null : v.onOxygen ? 2 : 0],
    ["temp", pTemp(v.temp)],
    ["systolic", pSystolic(v.systolic)],
    ["pulse", pPulse(v.pulse)],
    ["consciousness", v.consciousness == null ? null : v.consciousness === "altered" ? 3 : 0],
  ];
  const params: Record<string, number> = {};
  const missing: string[] = [];
  let total = 0;
  let anyThree = false;
  for (const [k, pts] of entries) {
    if (pts == null) missing.push(k);
    else {
      params[k] = pts;
      total += pts;
      if (pts === 3) anyThree = true;
    }
  }
  // NEWS2 escalation → band: 0=0, 1–4=เฝ้าดู, 5–6 หรือ single=3 → แดง, ≥7 → ด่วน.
  let b: Band = 0;
  if (total >= 7) b = 3;
  else if (total >= 5 || anyThree) b = 2;
  else if (total >= 1) b = 1;
  return { total, params, missing, anyThree, band: b, incomplete: missing.length > 0 };
}

// ───────────────────────── Track 2: Symptom (2-class model) ─────────────────────────
// Class A = อันตรายในตัวเอง → แดงตั้งแต่มาเล่า (R5 ไม่ใช้). Class B = ต้องมี danger sign ร่วม.
// Reference data for the extraction layer (docs table); scoring below takes booleans.
export const CLASS_A_SYMPTOMS = [
  "เจ็บหน้าอก", "แน่นหน้าอก", "จุกอก",
  "หน้าเบี้ยว", "ปากเบี้ยว", "แขนขาอ่อนแรง", "อ่อนแรงครึ่งซีก", "พูดไม่ชัด", "ลิ้นแข็ง",
  "หายใจไม่ออก", "หอบมาก", "ชัก", "เกร็งกระตุก", "หมดสติ", "ไม่รู้สึกตัว", "เรียกไม่รู้เรื่อง",
];
// danger signs ที่ยกให้ถึง "ด่วนมาก" (3) ทันที
const CRITICAL_SIGNS = ["หมดสติ", "ไม่รู้สึกตัว", "เรียกไม่รู้เรื่อง", "ชัก", "เกร็งกระตุก", "ไม่หายใจ", "หายใจไม่ออก", "ตัวเขียว", "ปากเขียว"];

// keys = คำเรียกอาการฐาน (alias หลายคำ เพราะญาติพูดต่างกัน "ท้องเสีย/ถ่ายเหลว", "ล้ม/หกล้ม")
export type ClassBRule = { keys: string[]; dangerSigns: string[]; source: string };
export const CLASS_B_RULES: ClassBRule[] = [
  { keys: ["ปวดท้อง", "ท้องอืด"], source: "BJGP 2024; AAFP", dangerSigns: ["เป็นเลือด", "มีเลือด", "อ้วกเป็นเลือด", "ถ่ายดำ", "ท้องแข็ง", "ปวดรุนแรง", "ความดันตก", "ไข้สูง"] },
  { keys: ["ปวดหัว", "ปวดศีรษะ"], source: "SNNOOP10 (JUCM/AAFP)", dangerSigns: ["เฉียบพลันรุนแรง", "คอแข็ง", "แขนขาอ่อนแรง", "พูดไม่ชัด", "ชัก", "ซึม", "สับสน", "อาเจียนพุ่ง"] },
  { keys: ["ไข้", "ตัวร้อน"], source: "sepsis red flags (elderly)", dangerSigns: ["หนาวสั่น", "สับสน", "ซึม", "หายใจเร็ว", "ความดันตก"] },
  { keys: ["ถ่ายเหลว", "ท้องเสีย", "ท้องร่วง", "ถ่ายบ่อย"], source: "NICE CKS acute diarrhoea", dangerSigns: ["เลือดปน", "เป็นเลือด", "มีเลือด", "ซึม", "ปัสสาวะน้อย", "ปากแห้ง", "กินน้ำไม่ได้", "ความดันตก"] },
  { keys: ["หายใจ", "หอบ", "เหนื่อย"], source: "dyspnea red flags", dangerSigns: ["หอบขณะพัก", "ตัวเขียว", "นอนราบไม่ได้", "ไอเป็นเลือด", "เจ็บหน้าอก"] },
  { keys: ["ปัสสาวะ", "ฉี่"], source: "UTI older people (PMC5873814)", dangerSigns: ["ปัสสาวะไม่ออก", "ไข้", "หนาวสั่น", "สับสน", "เลือดปน"] },
  { keys: ["ล้ม", "หกล้ม", "ลื่นล้ม"], source: "AAFP falls 2024; Merck", dangerSigns: ["หัวกระแทก", "หัวฟาด", "หมดสติ", "สับสน", "ลุกไม่ได้", "ลงน้ำหนักไม่ได้"] },
  { keys: ["บวม", "ขาบวม"], source: "Wells DVT", dangerSigns: ["บวมข้างเดียว", "ปวด", "กดเจ็บ", "เจ็บหน้าอก", "หอบ"] },
];

// symptomBand: cls = คลาสอาการ (A/B), dangerSignPresent = ตรวจเจอ danger sign ร่วมไหม (extraction ให้มา),
// critical = danger sign นั้นเป็นชนิดวิกฤต. Class B ไม่มี danger sign → เฝ้าดู (ไม่แดง) = แก้ over-triage.
export function symptomBand(cls: "A" | "B", dangerSignPresent: boolean, critical = false): Band {
  if (cls === "A") return critical ? 3 : 2; // อันตรายในตัวเอง
  if (!dangerSignPresent) return 1; // Class B เดี่ยวๆ = เฝ้าดู
  return critical ? 3 : 2;
}

// ───────────────────────── Track 3: Geriatric soft signs (I3) ─────────────────────────
export const SOFT_SIGNS = [
  "สับสน", "เพ้อ", "ซึม", "เบลอ", "งง", "ไม่ค่อยรู้เรื่อง",
  "ไม่กินข้าว", "กินน้อยลง", "เบื่ออาหาร", "ไม่ค่อยกิน", "ไม่ดื่มน้ำ",
  "อ่อนเพลีย", "ไม่มีแรง", "อ่อนแรง", "ลุกไม่ไหว", "นอนซม", "นอนทั้งวัน",
  "ล้ม", "เดินเซ", "ทรงตัวไม่ได้", "กลั้นไม่อยู่", "ไม่เหมือนเดิม",
];
const DELIRIUM_SIGNS = ["สับสน", "เพ้อ", "ซึม", "เบลอ", "ไม่ค่อยรู้เรื่อง"];
export const GERIATRIC_AGE = 70; // R11 — ปรับได้/frailty อาจดึงลง (ยังไม่ validated)

// geriatricBand: ยกระดับสำหรับผู้สูงอายุจาก soft signs. acute = มีคำเฉียบพลัน/แย่ลง/หลายวัน.
export function geriatricBand(
  age: number | null | undefined,
  softSigns: string[],
  acute = false,
): Band {
  if (age == null || age < GERIATRIC_AGE) return 0; // แกนนี้ยิงเฉพาะผู้สูงอายุ
  const has = (list: string[]) => softSigns.some((s) => list.includes(s));
  if (has(DELIRIUM_SIGNS)) return 2; // delirium = marker แรงสุด → แดง
  const n = new Set(softSigns.filter((s) => SOFT_SIGNS.includes(s))).size;
  if (n >= 2 || (n >= 1 && acute)) return 2; // หลายอย่าง/เฉียบพลัน → แดง
  if (n === 1) return 1; // เดี่ยว-เบา → เฝ้าดู (ไม่ over-triage)
  return 0;
}

// ───────────────────────── Combine (bias to caution = max) ─────────────────────────
export type RiskInput = {
  vitals?: Vitals;
  symptom?: { cls: "A" | "B"; dangerSignPresent: boolean; critical?: boolean } | null;
  age?: number | null;
  softSigns?: string[];
  acute?: boolean;
};
export type RiskResult = {
  band: Band;
  label: string;
  incomplete: boolean; // vitals ไม่ครบ → อย่าตีความว่าปลอดภัย (R13)
  reasons: string[]; // track ไหนดันระดับ
};

export function assessRisk(input: RiskInput): RiskResult {
  const reasons: string[] = [];
  const bands: Band[] = [];

  let incomplete = false;
  if (input.vitals) {
    const n = news2Score(input.vitals);
    bands.push(n.band);
    incomplete = n.incomplete;
    if (n.band > 0) reasons.push(`NEWS2=${n.total}${n.anyThree ? " (มีค่าเดี่ยว=3)" : ""} → ${BAND_LABEL[n.band]}`);
  } else {
    incomplete = true; // ไม่มี vital เลย
  }

  if (input.symptom) {
    const b = symptomBand(input.symptom.cls, input.symptom.dangerSignPresent, input.symptom.critical);
    bands.push(b);
    if (b > 0) reasons.push(`อาการ (class ${input.symptom.cls}${input.symptom.dangerSignPresent ? " + danger sign" : ""}) → ${BAND_LABEL[b]}`);
  }

  const gb = geriatricBand(input.age, input.softSigns ?? [], input.acute);
  bands.push(gb);
  if (gb > 0) reasons.push(`ผู้สูงอายุ + soft sign → ${BAND_LABEL[gb]}`);

  const finalBand = (bands.length ? (Math.max(...bands) as Band) : 0);
  return { band: finalBand, label: BAND_LABEL[finalBand], incomplete, reasons };
}

// ───────────────────────── Wiring → doctor-score ─────────────────────────
// Bridge NEWS2 (Band 0–3) onto the app's doctor-score Level (severity.ts: 1 ดูแลได้ดี,
// 2 ควรสังเกต, 3 ควรปรึกษาหมอ; 0 = ยังไม่มีข้อมูล). The caller combines this with the
// observation level via Math.max (bias to caution). Only the vitals track is live here —
// symptom/geriatric tracks need LLM extraction (roadmap W1). Kept import-free so it runs
// under `node --experimental-strip-types` without cross-file .ts-extension resolution.
export function news2Level(vitals?: Vitals | null): 0 | 1 | 2 | 3 {
  if (!vitals) return 0;
  const r = news2Score(vitals);
  if (Object.keys(r.params).length === 0) return 0; // วัดไม่มีเลย → ไม่ contribute
  // band 0(ปกติ)→1, 1(เฝ้าดู)→2, 2/3(แดง/ด่วน)→3 (doctor-score มีแค่ 3 ระดับ)
  return r.band === 0 ? 1 : r.band === 1 ? 2 : 3;
}

// ───────────────────────── W1: deterministic keyword extraction (safety-net) ─────────────────────────
// Scans free-text observations for danger signs / Class A symptoms / geriatric soft signs.
// This is the auditable safety-net (roadmap W1a); an LLM extraction can be unioned in later.
// W5 — context guard (Thai): a keyword doesn't count if it's negated / hypothetical (marker
// BEFORE it) or already resolved (marker AFTER it). Not full NLP, but covers the common
// false-positives ("ไม่มีเลือด", "กลัวจะมีเลือด", "ปวดหัวหายแล้ว").
const WIN = 10;
const NEG_BEFORE = ["ไม่", "งด", "กลัว", "เกรง", "กังวลว่า", "ถ้า", "หากมี"]; // negation + hypothetical
const RESOLVED_AFTER = ["หายแล้ว", "หายดี", "ดีขึ้น", "หยุดแล้ว", "ทุเลา", "ปกติแล้ว"]; // เลี่ยง "หาย" เดี่ยว (ชน "หายใจ")
export function containsSign(text: string, keyword: string): boolean {
  const t = text.toLowerCase();
  const kw = keyword.toLowerCase();
  for (let i = t.indexOf(kw); i !== -1; i = t.indexOf(kw, i + kw.length)) {
    const before = t.slice(Math.max(0, i - WIN), i);
    const after = t.slice(i + kw.length, i + kw.length + WIN);
    if (NEG_BEFORE.some((n) => before.includes(n))) continue;
    if (RESOLVED_AFTER.some((r) => after.includes(r))) continue;
    return true;
  }
  return false;
}

const ACUTE_WORDS = ["เฉียบพลัน", "มากขึ้น", "แย่ลง", "หลายวัน", "2 วัน", "สองวัน", "ทันที"];

// Canonical vocabulary given to the LLM (organizeNarrative) so it can map free phrasing →
// these tags at save time. The stored tags are unioned with the keyword net below (W1 union):
// the LLM raises recall (catches phrasings keywords miss) but code still decides the band.
export const CANONICAL_SIGNS: string[] = [
  ...new Set([
    ...CLASS_A_SYMPTOMS,
    ...CRITICAL_SIGNS,
    ...CLASS_B_RULES.flatMap((r) => [...r.keys, ...r.dangerSigns]),
    ...SOFT_SIGNS,
  ]),
];

// One observation's ESCALATION band (0 = no trigger found → let LLM severity stand).
// Only Class A, Class-B+danger-sign, or geriatric soft signs raise it — plain benign symptoms
// contribute 0 so this never inflates, only catches what the opaque severity number might miss.
// extraSigns = canonical tags pre-extracted by the LLM (union with the keyword net).
export function observationBand(text: string, age?: number | null, extraSigns: string[] = []): Band {
  const has = (kw: string) => containsSign(text, kw) || extraSigns.includes(kw);
  const bands: Band[] = [];
  const critical = CRITICAL_SIGNS.some(has);

  if (CLASS_A_SYMPTOMS.some(has)) bands.push(critical ? 3 : 2);

  for (const rule of CLASS_B_RULES) {
    if (rule.keys.some(has) && rule.dangerSigns.some(has)) bands.push(critical ? 3 : 2);
  }

  const softs = SOFT_SIGNS.filter(has);
  const acute = ACUTE_WORDS.some((w) => text.includes(w));
  bands.push(geriatricBand(age, softs, acute));

  return bands.length ? (Math.max(...bands) as Band) : 0;
}

// Observation escalation → doctor-score Level (0 = ไม่ยกระดับ, 2 = ควรสังเกต, 3 = ควรปรึกษาหมอ).
// Combined into the doctor-score via Math.max in the pages, alongside scoreLevel + news2Level.
export function observationEscalationLevel(text: string, age?: number | null, extraSigns: string[] = []): 0 | 2 | 3 {
  const b = observationBand(text, age, extraSigns);
  return b === 0 ? 0 : b === 1 ? 2 : 3;
}

// ───────────────────────── W3: weight-loss trend (longitudinal) ─────────────────────────
// Unintentional weight loss is a geriatric red flag that no single day trips — the app's daily
// log uniquely enables it. Compare the latest weight to the peak within a ~30-day window.
// 🟠 threshold 5% is a common clinical cutoff but NOT validated for this app — flag for review.
const DAY = 24 * 60 * 60 * 1000;
export function weightTrendLevel(weights: { kg: number; at: Date }[], now = 0): 0 | 2 {
  const t = now || Date.now();
  const sorted = [...weights].sort((a, b) => b.at.getTime() - a.at.getTime());
  const latest = sorted[0];
  if (!latest || sorted.length < 2) return 0;
  if (t - latest.at.getTime() > 7 * DAY) return 0; // ค่าล่าสุดต้องใหม่พอ (≤7 วัน)
  const windowStart = latest.at.getTime() - 30 * DAY;
  const peak = Math.max(...sorted.filter((w) => w.at.getTime() >= windowStart).map((w) => w.kg));
  if (peak <= 0) return 0;
  const dropPct = (peak - latest.kg) / peak;
  return dropPct >= 0.05 ? 2 : 0; // ลด ≥5% ใน ~30 วัน → ควรสังเกต
}

// Does one observation contain a soft sign (keyword net ∪ stored LLM tags)?
function obsHasSoftSign(o: { text: string; signs?: string | null }): boolean {
  const extra = o.signs ? o.signs.split("·").map((s) => s.trim()) : [];
  return SOFT_SIGNS.some((s) => containsSign(o.text, s) || extra.includes(s));
}

// Persistent soft signs in the elderly = chronic decline red flag. A one-off soft sign is only
// "watch" (obsEscalation), but showing up on ≥3 of the last 7 days → escalate to ควรปรึกษาหมอ.
export function persistentSoftSignLevel(
  observations: { text: string; signs?: string | null; at: Date }[],
  age?: number | null,
  now = 0,
): 0 | 3 {
  if (age == null || age < GERIATRIC_AGE) return 0;
  const weekAgo = (now || Date.now()) - 7 * DAY;
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" });
  const days = new Set<string>();
  for (const o of observations) {
    if (o.at.getTime() >= weekAgo && obsHasSoftSign(o)) days.add(fmt.format(o.at));
  }
  return days.size >= 3 ? 3 : 0;
}

// Recency-weighted "worst recent" observation level — REPLACES the old 7-day mean, which diluted
// a serious day among mild ones and depended on how MANY notes were written (frequency bias).
// Triage takes the WORST recent signal, not the average. band: severity 0–3→1, 4–7→2, 8–10→3,
// null→2. Recent (≤3 วัน) counts at full band; an older red (4–7 วัน) still lingers; older mild
// fades. Max naturally floors — a single red is red, never averaged away.
export function recentSeverityLevel(observations: { severity: number | null; at: Date }[], now = 0): 0 | 1 | 2 | 3 {
  const t = now || Date.now();
  let lv = 0;
  for (const o of observations) {
    const days = (t - o.at.getTime()) / DAY;
    if (days > 7) continue;
    const s = o.severity;
    const band = s == null ? 2 : s >= 8 ? 3 : s >= 4 ? 2 : 1; // = severityBand
    if (days <= 3) lv = Math.max(lv, band);
    else if (band === 3) lv = Math.max(lv, 3);
  }
  return lv as 0 | 1 | 2 | 3;
}
