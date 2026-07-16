// Evaluation of the SEVERITY judgement in organizeNarrative's system prompt (lib/ai.ts) against
// the real text model. Severity is the "worst-recent" doctor-score track (lib/risk.recentSeverityLevel),
// so mis-rated severity → wrong score. Feeds scenarios with an expected band and prints pass/fail.
// Run: `npx tsx scripts/severity-eval.mts`. Dev/eval only — not part of the build.
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const { organizeNarrative } = await import("../lib/ai.ts");

// band: lo = 0–3 (ทั่วไป/ข่าวดี) · mid = 4–7 (เฝ้าดู) · hi = 8–10 (ฉุกเฉิน/พบแพทย์)
type Band = "lo" | "mid" | "hi";
const bandOf = (s: number): Band => (s >= 8 ? "hi" : s >= 4 ? "mid" : "lo");

const CASES: { text: string; want: Band; note: string }[] = [
  // ── low (0–3): ข่าวดี / เรื้อรังคงที่ / เล็กน้อยหายแล้ว ──
  { text: "วันนี้ม้าอารมณ์ดี กินข้าวหมดจาน", want: "lo", note: "ข่าวดี" },
  { text: "ม้าปวดเข่าเรื้อรังเหมือนทุกวัน เดินได้ปกติ", want: "lo", note: "เรื้อรังคงที่" },
  { text: "ม้าปวดหัวนิดหน่อย กินยาพาราแล้วหาย", want: "lo", note: "เล็กน้อย+หายแล้ว" },
  { text: "วันนี้พาม้าไปเดินเล่นที่สวน อารมณ์ดีมาก", want: "lo", note: "กิจกรรมปกติ" },
  // ── mid (4–7): ผิดปกติเล็กน้อย ควรเฝ้าดู ──
  { text: "ม้ากินข้าวได้น้อยลงกว่าเดิม", want: "mid", note: "เปลี่ยนแปลง เฝ้าดู" },
  { text: "ม้านอนไม่ค่อยหลับมา 2-3 คืนแล้ว", want: "mid", note: "รบกวนการนอน" },
  { text: "ม้าบ่นปวดหลังมากขึ้นกว่าเดิม", want: "mid", note: "อาการแย่ลง" },
  // ── high (8–10) in-vocab: อาการโรคอันตราย ──
  { text: "ม้าเจ็บหน้าอก เหงื่อแตก หายใจไม่ทัน", want: "hi", note: "Class A หัวใจ" },
  { text: "ม้าซึมลง เรียกไม่ค่อยรู้เรื่องตั้งแต่เช้า", want: "hi", note: "delirium" },
  // ── high (8–10) OOV accidents/injuries (แกน severity ต้องจับ) ──
  { text: "แม่โดนน้ำร้อนลวกทั้งแขน พองเป็นแผลใหญ่", want: "hi", note: "แผลไฟไหม้/ลวก" },
  { text: "แม่สำลักอาหารติดคอ ไอจนหน้าเขียว", want: "hi", note: "สำลัก/airway" },
  { text: "มีเลือดออกไม่หยุดจากแผลที่ขา", want: "hi", note: "เลือดออกไม่หยุด" },
  { text: "เมื่อเช้าแม่ล้มในห้องน้ำ ลุกไม่ได้ ปวดสะโพกมาก", want: "hi", note: "ล้ม+บาดเจ็บ" },
  // ── off-domain / ไม่เกี่ยวสุขภาพ (ควรได้ต่ำ ~0) ──
  { text: "วันนี้รถติดมากเลยไปหาหมอสาย", want: "lo", note: "off-domain (ควร ~0)" },
  { text: "ค่าไฟเดือนนี้แพงกว่าปกติ", want: "lo", note: "off-domain (ควร ~0)" },
];

let pass = 0;
const fails: string[] = [];
for (const c of CASES) {
  let items;
  try { items = await organizeNarrative(c.text); }
  catch (e) { console.log(`  ERROR "${c.text}": ${e instanceof Error ? e.message : e}`); continue; }
  const maxSev = items.reduce((m, it) => Math.max(m, it.severity), 0);
  const got = bandOf(maxSev);
  const ok = got === c.want;
  if (ok) pass++; else fails.push(`"${c.text}" — got sev=${maxSev} (${got}), want ${c.want} [${c.note}]`);
  console.log(`${ok ? "✓" : "✗"} sev=${String(maxSev).padStart(2)} ${got.padEnd(3)} (want ${c.want.padEnd(3)}) · ${c.text}`);
}
console.log(`\n${pass}/${CASES.length} correct band`);
if (fails.length) { console.log("\nMISSES:"); for (const f of fails) console.log("  " + f); }
